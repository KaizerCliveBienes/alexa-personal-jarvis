import { getJson } from "serpapi";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import haversine from "haversine-distance";
import { DateTime } from "luxon";
import testFlightResponse from "../resources/test_flight_response.js";

export async function getNearestAirportIATACode(location) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(location)}&format=json`,
    {
      method: "GET",
    },
  );

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
  };

  const nearestIATA = await getNearestAirportIATA(
    foundLocation.latitude,
    foundLocation.longitude,
  );

  console.info(`nearest IATA to ${location} is ${nearestIATA}`);
  return nearestIATA;
}

export async function getNearestAirportIATA(lat, lon) {
  return new Promise((resolve, reject) => {
    let nearestAirport = null;
    let minDistance = Infinity;

    fs.createReadStream(path.join(process.cwd(), "resources/airport-iata.csv"))
      .pipe(csv())
      .on("data", (row) => {
        if (row.iata_code) {
          const airportCoords = {
            lat: parseFloat(row.latitude_deg),
            lon: parseFloat(row.longitude_deg),
          };
          const userCoords = { lat: parseFloat(lat), lon: parseFloat(lon) };
          const distance = haversine(userCoords, airportCoords);

          if (distance < minDistance) {
            minDistance = distance;
            nearestAirport = row;
          }
        }
      })
      .on("end", () =>
        resolve(nearestAirport ? nearestAirport.iata_code : "IATA Not Found"),
      )
      .on("error", reject);
  });
}

export function parseRelativeWeek(input) {
  const yearMonthRegex = /^\d{4}-\d{2}/;
  if (yearMonthRegex.test(input)) {
    return input + "-01";
  }

  const match = input.match(/(first|second|third|fourth|last) week of (\w+)/i);
  if (!match) return null;

  const weekMap = { first: 0, second: 1, third: 2, fourth: 3, last: 4 };
  const weekNumber = weekMap[match[1].toLowerCase()];
  const monthName = match[2];

  // Get the first day of the given month and year (current year)
  const now = DateTime.now().setLocale("Europe/Berlin");
  const monthIndex = DateTime.fromObject({
    month: DateTime.fromFormat(monthName, "MMMM").month,
    year: now.year,
  });

  // Find the first Monday of the month
  let firstMonday = monthIndex
    .startOf("month")
    .plus({ days: (8 - monthIndex.startOf("month").weekday) % 7 });

  if (weekNumber === 4) {
    firstMonday = monthIndex
      .endOf("month")
      .minus({ days: (monthIndex.endOf("month").weekday - 1) % 7 })
      .minus({ weeks: 1 });
  } else {
    firstMonday = firstMonday.plus({ weeks: weekNumber });
  }

  return firstMonday.toFormat("yyyy-MM-dd");
}

export async function getFlightOffers({
  origin,
  destination,
  departureDate,
  returnDate,
  serpApiKey,
  test,
}) {
  console.info("initiating finding flight offers");

  const originIATACode = await getNearestAirportIATACode(origin);
  const destinationIATACode = await getNearestAirportIATACode(destination);

  const isValidDateFormat = (str) => {
    // Regex to check if the string is in yyyy-mm-dd format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(str);
  };

  const formattedDepartureDate = isValidDateFormat(departureDate)
    ? departureDate
    : parseRelativeWeek(departureDate);
  const formattedReturnDate = isValidDateFormat(returnDate)
    ? returnDate
    : parseRelativeWeek(returnDate);

  console.info(
    "Parameters are:",
    JSON.stringify(
      {
        originIATACode,
        destinationIATACode,
        formattedDepartureDate,
        formattedReturnDate,
      },
      "",
      4,
    ),
  );

  let flightResponse;
  if (test) {
    flightResponse = testFlightResponse;
  } else {
    flightResponse = await getJson({
      engine: "google_flights",
      api_key: serpApiKey,
      departure_id: originIATACode,
      arrival_id: destinationIATACode,
      outbound_date: formattedDepartureDate,
      return_date: formattedReturnDate,
      currency: "EUR",
      hl: "en",
      gl: "de",
      adults: 1,
    });
  }

  console.info(JSON.stringify(flightResponse, "", 4));

  return flightResponse;
}

export function formatFlightOffers(flightData) {
  if (!flightData.best_flights && !flightData.other_flights) {
    return "";
  }

  const flightDataList =
    !("best_flights" in flightData) || flightData.best_flights.length === 0
      ? flightData.other_flights
      : flightData.best_flights;

  const formattedFlights = flightDataList.map((flight) => ({
    totalDuration: flight.total_duration,
    price: flight.price,
    layovers: (flight.layovers ?? []).map((layover) => ({
      duration: layover.duration,
      name: layover.name,
      overnight: layover.overnight,
    })),
    flightLegs: (flight.flights ?? []).map((flightLeg) => ({
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
