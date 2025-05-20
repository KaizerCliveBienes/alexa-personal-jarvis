import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { handler } from '../../index.js';
import Context from '../../strategies/context.js';
import ReadNewsStrategy from '../../strategies/read-news-strategy.js';
import StopStrategy from '../../strategies/stop-strategy.js';
import FallbackStrategy from '../../strategies/fallback-strategy.js';
import ChatStrategy from '../../strategies/chat-strategy.js';
import TranspoPathStrategy from '../../strategies/transpo-path-strategy.js';
import FlightFinderStrategy from '../../strategies/flight-finder-strategy.js';

vi.mock('../../strategies/context.js');
vi.mock('../../strategies/read-news-strategy.js');
vi.mock('../../strategies/stop-strategy.js');
vi.mock('../../strategies/fallback-strategy.js');
vi.mock('../../strategies/chat-strategy.js');
vi.mock('../../strategies/transpo-path-strategy.js');
vi.mock('../../strategies/flight-finder-strategy.js');
vi.mock('openai', () => {
  const mockOpenAI = vi.fn();

  mockOpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked response from OpenAI' } }],
        }),
      },
    },
  }));

  return {
    OpenAI: mockOpenAI,
  };
});

describe('Handler Tests', () => {
  let contextMock;

  beforeEach(() => {
    contextMock = new Context();
    Context.mockImplementation(() => contextMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use ReadNewsStrategy for readNewsIntent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'ReadNewsIntent',
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(ReadNewsStrategy));
  });

  it('should use StopStrategy for stopIntent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'AMAZON.StopIntent',
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(StopStrategy));
  });

  it('should use ChatStrategy for chatIntent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'ChatGPTIntent',
          slots: {
            query: { value: 'Hello' },
          },
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(ChatStrategy));
  });

  it('should use TranspoPathStrategy for transpoPathIntent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'TranspoPathIntent',
          slots: {
            from: { value: 'Location A' },
            to: { value: 'Location B' },
            date: { value: '2025-05-18' },
            time: { value: '10:00' },
          },
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(TranspoPathStrategy));
  });

  it('should use FlightFinderStrategy for flightFinderIntent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'FlightFinderIntent',
          slots: {
            origin: { value: 'City A' },
            destination: { value: 'City B' },
            departureDate: { value: '2025-05-20' },
            returnDate: { value: '2025-05-25' },
            test: { value: "true" },
          },
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(FlightFinderStrategy));
  });

  it('should use FallbackStrategy for unknown intent', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'UnknownIntent',
        },
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(FallbackStrategy));
  });

  it('should use FallbackStrategy for non-intent request', async () => {
    const event = {
      request: {
        type: 'LaunchRequest',
      },
    };

    await handler(event);

    expect(contextMock.setStrategy).toHaveBeenCalledWith(expect.any(FallbackStrategy));
  });

  it('should handle errors gracefully', async () => {
    const event = {
      request: {
        type: 'IntentRequest',
        intent: {
          name: 'readNewsIntent',
        },
      },
    };

    contextMock.executeStrategy.mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    const response = await handler(event);

    expect(response).toEqual({
      version: expect.any(String),
      response: {
        outputSpeech: {
          type: expect.any(String),
          text: expect.any(String),
        },
        shouldEndSession: true,
      },
    });
  });
});
