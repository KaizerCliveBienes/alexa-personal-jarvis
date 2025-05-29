import Strategy from "./strategy.js";

class ChatStrategy extends Strategy {
  constructor(genai) {
    super();
    this.genai = genai;
  }
  async execute(parameters) {
    const response = await this.genai.chatQuery(
      "you are a helpful assistant that is responding via text but will be converted into audio afterwards. make the response conversational and try to condense your answers a bit.",
      parameters.userQuery,
    );

    const chatResponse = "jarvis responded: " + response;

    console.info("[agent response]" + chatResponse);

    return this.formatResponse(chatResponse);
  }

  formatResponse(content) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: content,
        },
        shouldEndSession: false,
      },
    };
  }
}

export default ChatStrategy;
