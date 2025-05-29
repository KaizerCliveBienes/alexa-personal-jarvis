import Strategy from "./strategy.js";
import fetch from "node-fetch";
import { DateTime } from "luxon";

class TranspoPathStrategy extends Strategy {
  constructor(googleMapsApiKey) {
    super();
    this.googleMapsApiKey = googleMapsApiKey;
  }

  async execute({ from, to, date, time }) {
    const fromLocationId = await this.fetchNearestLocationId(
      await this.fetchLocation(from),
    );
    const toLocationId = await this.fetchNearestLocationId(
      await this.fetchLocation(to),
    );
    const dateTime = this.parseDepartureTime(date, time);

    return this.formatResponse(
      await this.fetchJourney(fromLocationId, toLocationId, dateTime),
      date,
      time,
    );
  }

  parseDepartureTime(date, time) {
    let dateTime = null;
    if (date || time) {
      const dateSlot = this.convertRelativeDate(date);
      dateTime = `&departure=${encodeURIComponent(`${dateSlot ?? date ?? ""} ${time ?? ""}`)}`;
      console.info("fetched with date time: ", dateSlot, time);
    }

    return dateTime;
  }
  convertRelativeDate(dateSlot) {
    let now = DateTime.now().setZone("Europe/Berlin");

    if (!dateSlot) {
      return now.toISODate();
    }

    if (dateSlot.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return DateTime.fromISO(dateSlot).setZone("Europe/Berlin").toISODate();
    }

    if (dateSlot === "TOMORROW") {
      return now.plus({ days: 1 }).toISODate();
    }

    if (dateSlot.match(/^XXXX-W\d{2}-\d$/)) {
      let weekday = parseInt(dateSlot.split("-")[2]);
      let parsedDate = now.set({ weekday: weekday });

      if (parsedDate < now) {
        parsedDate = parsedDate.plus({ days: 7 });
      }

      return parsedDate.toISODate();
    }

    return null;
  }

  async fetchJourney(fromLocationId, toLocationId, dateTime) {
    console.info("trying to fetch journey");
    const response = await fetch(
      `https://v6.bvg.transport.rest/journeys?from=${fromLocationId}&to=${toLocationId}&results=1${dateTime}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error("Can't fetch the journey.");
    }

    const responseJson = await response.json();
    if (responseJson.journeys.length === 0) {
      throw new Error("No journeys found!");
    }

    return responseJson.journeys[0];
  }

  async fetchNearestLocationId(location) {
    console.info("trying to fetch nearest loaction id");
    const response = await fetch(
      `https://v6.bvg.transport.rest/locations/nearby?latitude=${location.lat}&longitude=${location.lng}&results=1`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error("Can't fetch nearest location.");
    }

    const responseJson = await response.json();
    if (responseJson.length === 0) {
      throw new Error("Can't find the nearest location.");
    }

    return responseJson[0].id;
  }

  async fetchLocation(location) {
    console.info("trying to fetch loaction in maps");
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}+Berlin,+Germany&key=${this.googleMapsApiKey}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error(
        "Can't fetch value in google maps for location: " + location,
      );
    }

    const responseJson = await response.json();
    if (!("results" in responseJson) || responseJson.results.length === 0) {
      throw new Error(
        "Can't find any results in google maps for location: " + location,
      );
    }

    return responseJson.results[0].geometry.location ?? null;
  }

  formatResponse(content, date, time) {
    const getOrdinal = (n) => {
      let ord = "th";

      if (n % 10 == 1 && n % 100 != 11) {
        ord = "st";
      } else if (n % 10 == 2 && n % 100 != 12) {
        ord = "nd";
      } else if (n % 10 == 3 && n % 100 != 13) {
        ord = "rd";
      }

      return n + ord;
    };

    const getDifferenceInMinutes = (fromDateTime, toDateTime) => {
      const plannedDeparture = new Date(fromDateTime);
      const plannedArrival = new Date(toDateTime);

      const diffMs = plannedArrival - plannedDeparture;

      const diffMinutes = diffMs / (1000 * 60);

      return diffMinutes;
    };

    const modifyLocationName = (locationName) => {
      return locationName
        ? locationName
            .replace("(Berlin)", "")
            .replace("str.", " Strasse")
            .replace(" Str.", " Straße")
            .replace(" Bhf", " Bahnhof")
        : "";
    };

    const formatTransportationType = (currentLeg, destination, isShort) => {
      if (!("line" in currentLeg) && !("walking" in currentLeg)) {
        return;
      }

      const formatTransportationMode = (currentLine) => {
        if (!currentLine) {
          return "";
        }

        return currentLine.mode === "bus"
          ? `${currentLine.product}, ${currentLine.name},`
          : `${currentLine.product ?? ""} ${currentLine.mode ?? ""}, ${currentLine.name ?? ""},`;
      };

      if (isShort) {
        return currentLeg.line
          ? `take the ${formatTransportationMode(currentLeg.line ?? "")} to ${destination}. `
          : currentLeg.walking
            ? `walk for ${currentLeg.distance ?? ""} meters to ${destination}. `
            : "";
      }

      if (currentLeg.line) {
        return `take the ${formatTransportationMode(currentLeg.line ?? "")} going to ${modifyLocationName(currentLeg.direction)} and depart at`;
      }

      return currentLeg.walking
        ? `walk for ${currentLeg.distance} meters to`
        : "";
    };

    let totalJourney = 0;
    let summary = "in summary, ";
    const legsFormatted = content.legs.reduce(
      (accumulator, currentValue, legIndex) => {
        const origin = modifyLocationName(currentValue.origin.name ?? "");
        const destination = modifyLocationName(
          currentValue.destination.name ?? "",
        );

        const travelTimeInMinutes = getDifferenceInMinutes(
          currentValue.plannedDeparture,
          currentValue.plannedArrival,
        );

        summary += formatTransportationType(currentValue, destination, true);

        totalJourney += travelTimeInMinutes;

        return ` ${accumulator}\n\n${getOrdinal(legIndex + 1)}, from ${origin}, ${formatTransportationType(currentValue, destination)} ${destination}; this takes about ${travelTimeInMinutes} minutes.`;
      },
      "",
    );

    let departureTimeMessage =
      date || time ? `If you leave at ${date ?? ""} ${time ?? ""}` : "";
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Jarvis got the following transporation path: ${departureTimeMessage} ${legsFormatted}\n\n${summary}\n\nTotal journey is ${totalJourney} minutes.`,
        },
        shouldEndSession: true,
      },
    };
  }
}

export default TranspoPathStrategy;
