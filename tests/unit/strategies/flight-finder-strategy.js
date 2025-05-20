import FlightFinderStrategy from '../../../strategies/flight-finder-strategy.js';
import { getFlightOffers } from '../../../services/flight-service.js';

describe('FlightFinderStrategy', () => {
  let strategy;
  const serpApiKey = 'test-api-key';
  const genai = {
    chatQuery: vi.fn(),
  };

  beforeEach(() => {
    vi.mock('../../../services/flight-service.js', () => ({
      getFlightOffers: vi.fn(),
    }));

    strategy = new FlightFinderStrategy(serpApiKey, genai);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should return formatted response with flight offers', async () => {
      const parameters = { origin: 'NYC', destination: 'LAX' };
      const mockFlightOffers = [{ airline: 'Airline A', duration: 120, price: 200 }];
      const mockChatResponse = 'Flight A: 2 hours, 200 euros';

      getFlightOffers.mockResolvedValue(mockFlightOffers);
      genai.chatQuery.mockResolvedValue(mockChatResponse);

      const response = await strategy.execute(parameters);

      expect(getFlightOffers).toHaveBeenCalledWith({ ...parameters, serpApiKey });
      expect(genai.chatQuery).toHaveBeenCalledWith(
        expect.stringContaining('you are a helpful flight summarizer assistant'),
        JSON.stringify(mockFlightOffers)
      );
      expect(response).toEqual({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: `Jarvis found the following flights: ${mockChatResponse}`,
          },
          shouldEndSession: false,
        },
      });
    });
  });

  describe('formatResponse', () => {
    it('should format the response correctly', () => {
      const flightsFoundSummary = 'Flight A: 2 hours, 200 euros';
      const response = strategy.formatResponse(flightsFoundSummary);

      expect(response).toEqual({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: `Jarvis found the following flights: ${flightsFoundSummary}`,
          },
          shouldEndSession: false,
        },
      });
    });
  });
});

