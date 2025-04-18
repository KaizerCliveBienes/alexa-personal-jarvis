import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';

export const fetchLatestNews = async (genai, count = 3) => {
  const response = await fetch('https://www.manilatimes.net/news/feed/', {
    method: 'GET',
  });

  if (response.status !== 200 || !response.ok) {
    throw new Error("Can't fetch!");
  }

  const parser = new XMLParser();
  const newsList = parser.parse(await response.text());

  const newsItems = (newsList.rss.channel.item ?? []).slice(0, count);

  const newsSummary = [];
  for (let i in newsItems) {
    newsSummary.push(await summaryNews(genai, newsItems[i].title, newsItems[i].description));
  }

  return newsSummary;
};

const summaryNews = async (genai, title, fullDescription) => {
  return await genai.chatQuery(
    "You are a helpful news broadcaster that is responding via text but will be converted into audio afterwards. Your task is to summarize the given news title and description.",
    `title: ${title} description: ${fullDescription}`,
  );
};

