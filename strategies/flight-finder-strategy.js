import Strategy from './strategy.js';
import { getJson } from 'serpapi';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import haversine from 'haversine-distance';

class FlightFinderStrategy extends Strategy {
  constructor(serpApiKey, genai) {
    super();
    this.serpApiKey = serpApiKey;
    this.genai = genai;
  }

  async execute(parameters) {
    const flightOffers = this.formatFlightOffers(await this.getFlightOffers(parameters));
    const chatResponse = await this.genai.chatQuery(
      `you are a helpful flight summarizer assistant. you will be given a JSON list of flight options and your job is to summarize the list of options in a sentence format so that the user can have an informed decision. also do not ask for additional information but suggest what will be the best option after summarizing all available options. finally, make sure to cover the following for each option:  1. convert the duration from minutes, to hours and minutes; 2. the price is also in euros; 3. highlight the flight airline`,
      JSON.stringify(flightOffers),
    );

    return this.formatResponse(chatResponse);
  }

  async getNearestAirportIATACode(location) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(location)}&format=json`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error("Can't fetch nearest place for: " + location);
    }

    const responseJson = await response.json();
    if (responseJson.length === 0) {
      throw new Error("No nearest place retrieved: " + location);
    }

    const foundLocation = {
      latitude: responseJson[0].lat,
      longitude: responseJson[0].lon,
    }


    const nearestIATA = await this.getNearestAirportIATA(foundLocation.latitude, foundLocation.longitude);

    console.info(`nearest IATA to ${location} is ${nearestIATA}`);
    return nearestIATA;
  }

  async getNearestAirportIATA(lat, lon) {
    return new Promise((resolve, reject) => {
      let nearestAirport = null;
      let minDistance = Infinity;

      fs.createReadStream(path.join(process.cwd(), 'resources/airport-iata.csv')).pipe(csv())
        .on('data', (row) => {
          if (row.iata_code) {
            const airportCoords = { lat: parseFloat(row.latitude_deg), lon: parseFloat(row.longitude_deg) };
            const userCoords = { lat: parseFloat(lat), lon: parseFloat(lon) };
            const distance = haversine(userCoords, airportCoords);

            if (distance < minDistance) {
              minDistance = distance;
              nearestAirport = row;
            }
          }
        })
        .on('end', () => resolve(nearestAirport ? nearestAirport.iata_code : "IATA Not Found"))
        .on('error', reject);
    });
  }


  parseRelativeWeek(input) {
    const yearMonthRegex = /^\d{4}-\d{2}/;
    if (yearMonthRegex.test(input)) {
      return input + '-01';
    }

    const match = input.match(/(first|second|third|fourth|last) week of (\w+)/i);
    if (!match) return null;

    const weekMap = { first: 0, second: 1, third: 2, fourth: 3, last: 4 };
    const weekNumber = weekMap[match[1].toLowerCase()];
    const monthName = match[2];

    // Get the first day of the given month and year (current year)
    const now = DateTime.now().setLocale('Europe/Berlin');
    const monthIndex = DateTime.fromObject({ month: DateTime.fromFormat(monthName, 'MMMM').month, year: now.year });

    // Find the first Monday of the month
    let firstMonday = monthIndex.startOf('month').plus({ days: (8 - monthIndex.startOf('month').weekday) % 7 });

    if (weekNumber === 4) {
      firstMonday = monthIndex.endOf('month').minus({ days: (monthIndex.endOf('month').weekday - 1) % 7 }).minus({ weeks: 1 });
    } else {
      firstMonday = firstMonday.plus({ weeks: weekNumber });
    }

    return firstMonday.toFormat("yyyy-MM-dd");
  }

  async getFlightOffers({ origin, destination, departureDate, returnDate }) {
    console.info("initiating finding flight offers");

    const originIATACode = await this.getNearestAirportIATACode(origin);
    const destinationIATACode = await this.getNearestAirportIATACode(destination);

    const isValidDateFormat = (str) => {
      // Regex to check if the string is in yyyy-mm-dd format
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      return regex.test(str);
    };

    const formattedDepartureDate = isValidDateFormat(departureDate) ? departureDate : this.parseRelativeWeek(departureDate);
    const formattedReturnDate = isValidDateFormat(returnDate) ? returnDate : this.parseRelativeWeek(returnDate);

    console.info("Parameters are:", JSON.stringify({
      originIATACode,
      destinationIATACode,
      formattedDepartureDate,
      formattedReturnDate,
    }, '', 4));

    const response = await getJson({
      engine: "google_flights",
      api_key: this.serpApiKey,
      departure_id: originIATACode,
      arrival_id: destinationIATACode,
      outbound_date: formattedDepartureDate,
      return_date: formattedReturnDate,
      currency: 'EUR',
      hl: 'en',
      gl: 'de',
      adults: 1,
    });

    console.info(JSON.stringify(response, '', 4));
    return response;
  }

  formatFlightOffers(flightData) {
    if (!flightData.best_flights && !flightData.other_flights) {
      return '';
    }

    const flightDataList = (!('best_flights' in flightData) || flightData.best_flights.length === 0)
      ? flightData.other_flights
      : flightData.best_flights;

    const formattedFlights = flightDataList.map(flight => ({
      totalDuration: flight.total_duration,
      price: flight.price,
      layovers: (flight.layovers ?? []).map(layover => ({
        duration: layover.duration,
        name: layover.name,
        overnight: layover.overnight,
      })),
      flightLegs: (flight.flights ?? []).map(flightLeg => ({
        departure: {
          name: flightLeg.departure_airport.name,
          time: flightLeg.departure_airport.time,
        },
        arrival: {
          name: flightLeg.arrival_airport.name,
          time: flightLeg.arrival_airport.time,
        },
        duration: flightLeg.duration,
        airline: flightLeg.airline,
        travelClass: flightLeg.travel_class,
        oftenDelayed: flightLeg.often_delayed_by_over_30_mins,
      })),
    }));

    console.info("mapped data:");
    console.dir(JSON.parse(JSON.stringify(formattedFlights)), { depth: null });

    return formattedFlights;
  }

  formatResponse(flightsFoundSummary) {
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Jarvis found the following flights: ${flightsFoundSummary}`,
        },
        shouldEndSession: false,
      },
    };
  };

  formatResponseManually(flightsFound) {
    const getOrdinal = (n) => {
      let ord = 'th';

      if (n % 10 == 1 && n % 100 != 11) {
        ord = 'st';
      }
      else if (n % 10 == 2 && n % 100 != 12) {
        ord = 'nd';
      }
      else if (n % 10 == 3 && n % 100 != 13) {
        ord = 'rd';
      }

      return n + ord;
    };

    const flightsFoundText = flightsFound.reduce((accumulator, currentFlight, currentIndex) => {
      const airlinesList = {};
      let departureTime = null;
      let arrivalTime = null;
      for (let i = 0; i < currentFlight.flightLegs.length; i++) {
        if (i == 0) {
          console.info('departure:', currentFlight.flightLegs[i].departure.time);
          departureTime = DateTime.fromFormat(currentFlight.flightLegs[i].departure.time, 'yyyy-MM-dd T').toFormat('DDD t');
        }

        if (i == currentFlight.flightLegs.length - 1) {
          console.info('arrival:', currentFlight.flightLegs[i].arrival.time);
          arrivalTime = DateTime.fromFormat(currentFlight.flightLegs[i].arrival.time, 'yyyy-MM-dd T').toFormat('DDD t');
        }

        airlinesList[currentFlight.flightLegs[i].airline] = true;
      };

      const flightData = `${getOrdinal(currentIndex + 1)} result, `
        + ` for ${currentFlight.price} euros, with the airlines ${Object.keys(airlinesList).join(', ')};`
        + ` the departure is from ${departureTime} to ${arrivalTime}`
        + ` and the total duration is ${parseInt(currentFlight.totalDuration / 60)} hours and ${currentFlight.totalDuration % 60} minutes.\n\n`;

      return `${accumulator} ${flightData}\n\n`;
    }, '');
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Jarvis found the following flights here: ${flightsFoundText}`,
        },
        shouldEndSession: false,
      },
    };
  }
}

export default FlightFinderStrategy;
