import { OpenAI } from 'openai';
import Context from './strategies/context.js';
import ReadNewsStrategy from './strategies/read-news-strategy.js';
import StopStrategy from './strategies/stop-strategy.js';
import FallbackStrategy from './strategies/fallback-strategy.js';
import ChatStrategy from './strategies/chat-strategy.js';
import TranspoPathStrategy from './strategies/transpo-path-strategy.js';
import FlightFinderStrategy from './strategies/flight-finder-strategy.js';
import ChatGPT from './genai/chatgpt.js';
import config from './config/config.js';
import AWS from 'aws-sdk';
import StoreAudioFileTemp from './services/store-audio-file-temp.js';

const genai = new ChatGPT(
  new OpenAI({
    apiKey: process.env.CHATGPT_API_KEY,
  }),
  config.chatgpt.model,
);

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const serpApiKey = process.env.SERP_API_KEY;

const s3Client = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
  region: process.env.S3_REGION
});

const s3BucketName = process.env.S3_BUCKET_NAME;

export const handler = async (event, _) => {
  const context = new Context();
  let parameters = {};

  const storeAudioFileTemp = new StoreAudioFileTemp(s3Client, s3BucketName);

  try {
    if (event.request.type !== config.alexa.event.intentRequest) {
      context.setStrategy(new FallbackStrategy());
    } else {
      switch (event.request.intent.name) {
        case config.alexa.event.readNewsIntent:
          context.setStrategy(new ReadNewsStrategy(genai, storeAudioFileTemp));
          break;
        case config.alexa.event.stopIntent:
          context.setStrategy(new StopStrategy());
          break;
        case config.alexa.event.chatIntent:
          parameters = {
            ...parameters,
            userQuery: event.request.intent.slots.query.value,
          };

          context.setStrategy(
            new ChatStrategy(
              genai,
              storeAudioFileTemp,
            )
          );
          break;
        case config.alexa.event.transpoPathIntent:
          parameters = {
            ...parameters,
            from: event.request.intent.slots.from.value,
            to: event.request.intent.slots.to.value,
            date: event.request.intent.slots.date.value,
            time: event.request.intent.slots.time.value,
          };

          context.setStrategy(new TranspoPathStrategy(googleMapsApiKey));
          break;
        case config.alexa.event.flightFinderIntent:
          console.info(JSON.stringify(event.request.intent.slots, null, 2));
          parameters = {
            ...parameters,
            origin: event.request.intent.slots.origin.value,
            destination: event.request.intent.slots.destination.value,
            departureDate: event.request.intent.slots.departureDate.value,
            returnDate: event.request.intent.slots.returnDate.value,
            test: (event.request.intent.slots.test.value ?? "false" === "true"),
          };

          context.setStrategy(new FlightFinderStrategy(serpApiKey, genai));
          console.log("intenthereafter: " + event.request.intent.name);
          break;
        default:
          context.setStrategy(new FallbackStrategy());
      }
    }

    return await context.executeStrategy(parameters);
  } catch (error) {
    console.error('Error:', error);

    return {
      version: config.alexa.version,
      response: {
        outputSpeech: {
          type: config.alexa.outputSpeechType,
          text: config.alexa.text.errorText,
        },
        shouldEndSession: true,
      },
    };
  }
};
