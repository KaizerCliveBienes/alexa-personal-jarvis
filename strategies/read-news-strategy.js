import { fetchLatestNews } from '../services/read-news-fetch.js';
import Strategy from './strategy.js';

class ReadNewsStrategy extends Strategy {
  constructor(genai) {
    super();
    this.genai = genai;
  }

  async execute(_) {
    return this.formatResponse(await fetchLatestNews(this.genai));
  }

  formatResponse(content) {
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Jarvis got the following news: ${content}`,
        },
        shouldEndSession: true,
      },
    };
  }
}

export default ReadNewsStrategy;
