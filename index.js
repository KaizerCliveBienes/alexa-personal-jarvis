import { OpenAI } from "openai";
import Context from "./strategies/context.js";
import ReadNewsStrategy from "./strategies/read-news-strategy.js";
import StopStrategy from "./strategies/stop-strategy.js";
import FallbackStrategy from "./strategies/fallback-strategy.js";
import ChatStrategy from "./strategies/chat-strategy.js";
import TranspoPathStrategy from "./strategies/transpo-path-strategy.js";
import FlightFinderStrategy from "./strategies/flight-finder-strategy.js";
import ChatGPT from "./genai/chatgpt.js";
import config from "./config/config.js";
import AWS from "aws-sdk";
import StoreAudioFileTemp from "./services/store-audio-file-temp.js";
import { SSMClient } from "@aws-sdk/client-ssm";
import { getParamOrDefault } from "./services/get-ssm-parameters.js";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const genai = new ChatGPT(
  new OpenAI({
    apiKey: await getParamOrDefault(
      ssmClient,
      "chatgpt-api-key",
      "CHATGPT_API_KEY",
      true,
    ),
  }),
  config.chatgpt.model,
);

const s3Client = new AWS.S3({
  accessKeyId: await getParamOrDefault(
    ssmClient,
    "aws-s3-access-key-id",
    "S3_ACCESS_KEY_ID",
    true,
  ),
  secretAccessKey: await getParamOrDefault(
    ssmClient,
    "aws-s3-access-key-secret",
    "S3_ACCESS_KEY_SECRET",
    true,
  ),
  region: process.env.S3_REGION,
});

const s3BucketName = process.env.S3_BUCKET_NAME;

export const handler = async (event, _) => {
  const storeAudioFileTemp = new StoreAudioFileTemp(s3Client, s3BucketName);
  const context = new Context();
  let parameters = {};

  if (event?.action === "construct-read-news") {
    context.setStrategy(new ReadNewsStrategy(genai, storeAudioFileTemp));
    parameters = {
      ...parameters,
      test: (event?.test ?? "false") === "true",
      action: event?.action,
    };

    return await context.executeStrategy(parameters);
  }

  try {
    if (event.request.type !== config.alexa.event.intentRequest) {
      context.setStrategy(new FallbackStrategy());
    } else {
      switch (event.request.intent.name) {
        case config.alexa.event.readNewsIntent:
          parameters = {
            ...parameters,
            test:
              (event.request?.intent?.slots?.test?.value ?? "false") === "true",
            action: "fetch-latest-news",
          };

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

          context.setStrategy(new ChatStrategy(genai, storeAudioFileTemp));
          break;
        case config.alexa.event.transpoPathIntent:
          parameters = {
            ...parameters,
            from: event.request.intent.slots.from.value,
            to: event.request.intent.slots.to.value,
            date: event.request.intent.slots.date.value,
            time: event.request.intent.slots.time.value,
          };

          const googleMapsApiKey = await getParamOrDefault(
            ssmClient,
            "google-maps-api-key",
            "GOOGLE_MAPS_API_KEY",
            true,
          );
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
            test: event.request.intent.slots?.test?.value ?? "false" === "true",
          };

          const serpApiKey = await getParamOrDefault(
            ssmClient,
            "serp-api-key",
            "SERP_API_KEY",
            true,
          );
          context.setStrategy(new FlightFinderStrategy(serpApiKey, genai));
          break;
        default:
          context.setStrategy(new FallbackStrategy());
      }
    }

    return await context.executeStrategy(parameters);
  } catch (error) {
    console.error("Error:", error);

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
