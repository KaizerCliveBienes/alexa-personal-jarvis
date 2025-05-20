import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';
import config from '../config/config.js';

export const fetchLatestNews = async (genai) => {
  const newsSources = config.readNews.newsSources
  const newsSummary = [];
  for (let index = 0; index < newsSources.length; index++) {
    const newsSource = newsSources[index];
    
    const response = await fetch(newsSource.url, {
      method: 'GET',
    });

    if (response.status !== 200 || !response.ok) {
      throw new Error(`Can't fetch from ${newsSource.source}`);
    }

    const parser = new XMLParser();
    const newsList = parser.parse(await response.text());

    const count = newsSource.limit ?? 5
    const newsItems = (newsList.rss.channel.item ?? []).slice(0, count);
    for (let i in newsItems) {
      newsSummary.push({
        source: newsSource.source,
        title: newsItems[i].title,
        description: newsItems[i].description,
      });
    }
  }

  const summary = await summaryNews(genai, JSON.stringify(newsSummary));
  return summary;
};

const summaryNews = async (genai, newsSummary) => {
  return await genai.chatQuery(
    config.readNews.chatQuery,
    `${newsSummary}`
  );
};

