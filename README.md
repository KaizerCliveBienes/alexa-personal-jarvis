# Alexa Skill Lambda (Jarvis): Multi-Function Assistant

This AWS Lambda function serves as the backend for multiple alexa skills, enabling users to interact with various services through voice commands. It uses the Strategy design pattern to route requests based on Alexa intents to the appropriate handler.

## Features

This skill provides the following functionalities:

1.  **Chat with ChatGPT (Jarvis Chat):** Engage in conversations with OpenAI's ChatGPT. Ask questions, get explanations, or have a general chat.
2.  **Berlin Transportation Details (Jarvis Transpo):** Get public transportation directions between two points within Berlin, specifying date and time. Uses Google Maps API.
3.  **Flight Finder (Jarvis Flight):** Find the cheapest flight options for a given origin, destination, and dates (departure and optional return). Uses SerpApi for flight data and ChatGPT for processing/summarizing results.
4.  **Read News (Jarvis Chat):** Fetches and reads the latest news headlines from the Manila Times RSS feed, summarized by ChatGPT.

## Configuration

This Lambda function requires the following environment variables to be set:

* `CHATGPT_API_KEY`: Your API key for accessing the OpenAI API. Used for the chat feature and potentially news/flight processing.
* `Maps_API_KEY`: Your API key for the Google Maps Directions API. Used for fetching Berlin transportation routes.
* `SERP_API_KEY`: Your API key for SerpApi. Used for fetching flight search results.

It also relies on configuration values defined in `./config/configuration.yml` for Alexa event types, intent names, and response constants.

## Dependencies

This project relies on Node.js and uses external libraries, including:

* `openai`: For interacting with the OpenAI API (ChatGPT).

Ensure you install dependencies using `npm install` or `yarn install`.

## Usage Examples (Assuming Invocation Name "my assistant")

* **Chat:** "Alexa, ask Jarvis Chat *what is the capital of France?*"
* **Transportation:** "Alexa, ask Jarvis Transpo *how to get from Alexanderplatz to Brandenburg Gate in Berlin tomorrow at 9 AM?*"
* **Flight Finder:** "Alexa, ask Jarvis Flight *to find the cheapest flights from Berlin to Manila departing June 10th and returning June 20th.*"
* **Read News:** "Alexa, ask Jarvis Chat *to read the latest news.*"
* **Stop:** "Alexa, stop."

## Deployment

This function is designed to be deployed as an AWS Lambda function, triggered by an Alexa Skills Kit event source. Ensure the necessary environment variables are configured in the Lambda settings and the function has appropriate IAM permissions if accessing other AWS services.

## To execute sam via local invocation tests
```
sam build && sam local invoke   AlexaChatGPTHandlerFunction -e test/events/<event_to_test> --env-vars <env file>
```

