import Strategy from "./strategy.js";

class FallbackStrategy extends Strategy {
  async execute() {
    return this.formatResponse();
  }

  formatResponse(_) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Jarvis responded: Sorry, I didn't understand that.",
        },
        shouldEndSession: false,
      },
    };
  }
}

export default FallbackStrategy;
