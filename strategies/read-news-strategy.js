import { fetchLatestNews } from '../services/read-news-fetch.js';
import Strategy from './strategy.js';

class ReadNewsStrategy extends Strategy {
  constructor(genai, storeAudioFileTemp) {
    super();
    this.genai = genai;
    this.storeAudioFileTemp = storeAudioFileTemp;
  }

  async execute(_) {
    const content = await fetchLatestNews(this.genai);

    const buffer = Buffer.from(await this.genai.textToSpeech(content));
    const { url, key } = await this.storeAudioFileTemp.uploadAndGetTemporaryUrl(buffer);

    console.info("url: ", url, "key:", key);

    return this.formatResponse(url)
  }

  formatResponse(url) {
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Here is Jarvis for the news: `,
        },
        directives: [
          {
            "type": "AudioPlayer.Play",
            "playBehavior": "REPLACE_ALL",
            "audioItem": {
              "stream": {
                "token": "this-is-the-audio-token-" + Date.now(),
                "url": url,
                "offsetInMilliseconds": 0
              }
            }
          }
        ],
        shouldEndSession: true,
      },
    };
  }
}

export default ReadNewsStrategy;
