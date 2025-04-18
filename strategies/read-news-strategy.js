import { fetchLatestNews } from '../services/read-news-fetch.js';
import Strategy from './strategy.js';

class ReadNewsStrategy extends Strategy {
  constructor(genai) {
    super();
    this.genai = genai;
  }

  async execute(_) {
    const latestNews = (await fetchLatestNews(this.genai, 3))
      .reduce((accumulator, currentValue, currentIndex) => `${accumulator} News #${currentIndex + 1}. ${currentValue}`, '');

    return this.formatResponse(latestNews);
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
