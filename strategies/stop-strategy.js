import Strategy from "./strategy.js";

class StopStrategy extends Strategy {
  async execute(parameters) {
    return this.formatResponse();
  }

  formatResponse(_) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Jarvis says goodbye",
        },
        shouldEndSession: true,
      },
    };
  }
}

export default StopStrategy;
