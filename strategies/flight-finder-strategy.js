import Strategy from "./strategy.js";
import {
  getFlightOffers,
  formatFlightOffers,
} from "../services/flight-service.js";

class FlightFinderStrategy extends Strategy {
  constructor(serpApiKey, genai) {
    super();
    this.serpApiKey = serpApiKey;
    this.genai = genai;
  }

  async execute(parameters) {
    const flightOffers = formatFlightOffers(
      await getFlightOffers({ ...parameters, serpApiKey: this.serpApiKey }),
    );
    const chatResponse = await this.genai.chatQuery(
      `you are a helpful flight summarizer assistant. you will be given a JSON list of flight options and your job is to summarize the list of options in a sentence format so that the user can have an informed decision. also do not ask for additional information but suggest what will be the best option after summarizing all available options. finally, make sure to cover the following for each option:  1. convert the duration from minutes, to hours and minutes; 2. the price is also in euros; 3. highlight the flight airline`,
      JSON.stringify(flightOffers),
    );

    return this.formatResponse(chatResponse);
  }

  formatResponse(flightsFoundSummary) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Jarvis found the following flights: ${flightsFoundSummary}`,
        },
        shouldEndSession: false,
      },
    };
  }
}

export default FlightFinderStrategy;
