import { fetchLatestNews } from "../services/read-news-fetch.js";
import Strategy from "./strategy.js";

class ReadNewsStrategy extends Strategy {
  constructor(genai, storeAudioFileTemp) {
    super();
    this.genai = genai;
    this.storeAudioFileTemp = storeAudioFileTemp;
  }

  async execute(parameters) {
    if (parameters.action === "fetch-latest-news") {
      const { url, key } = parameters.test
        ? { url: "https://example.com", key: "test-file.mp3" }
        : await this.storeAudioFileTemp.getLatestAudioTemporaryUrl();

      console.info("fetch latest news. url: ", url, "key:", key);

      return this.formatResponse(url);
    }

    const content = await fetchLatestNews(this.genai);

    if (parameters.test) {
      console.info(`Test Read news intent content: ${content}`);
      return this.formatTextResponse(content);
    }

    const buffer = Buffer.from(await this.genai.textToSpeech(content));
    const { url, key } =
      await this.storeAudioFileTemp.uploadAndGetTemporaryUrl(buffer);

    console.info("url: ", url, "key:", key);

    return this.formatResponse(url);
  }

  formatTextResponse(content) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Here is Jarvis for the news: ${content}`,
        },
        shouldEndSession: true,
      },
    };
  }

  formatResponse(url) {
    return {
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Here is Jarvis for the news: `,
        },
        directives: [
          {
            type: "AudioPlayer.Play",
            playBehavior: "REPLACE_ALL",
            audioItem: {
              stream: {
                token: "this-is-the-audio-token-" + Date.now(),
                url: url,
                offsetInMilliseconds: 0,
              },
            },
          },
        ],
        shouldEndSession: true,
      },
    };
  }
}

export default ReadNewsStrategy;
