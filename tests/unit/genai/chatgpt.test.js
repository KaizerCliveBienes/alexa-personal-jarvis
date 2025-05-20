import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatGPT from '../../../genai/chatgpt.js';

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
  audio: {
    speech: {
      create: vi.fn(),
    },
  },
};

describe('ChatGPT', () => {
  let chatGPT;

  beforeEach(() => {
    chatGPT = new ChatGPT(mockOpenAI, 'gpt-4o-mini');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('chatQuery', () => {
    it('should return chat response content', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello, how can I help you?' } }],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await chatGPT.chatQuery('You are a helpful assistant.', 'What is the weather today?');
      expect(result).toBe('Hello, how can I help you?');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'What is the weather today?' },
        ],
      });
    });

    it('should return an empty string if no content is returned', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await chatGPT.chatQuery('You are a helpful assistant.', 'What is the weather today?');
      expect(result).toBe('');
    });
  });

  describe('textToSpeech', () => {
    it('should return audio data as an array buffer', async () => {
      const mockAudioData = new ArrayBuffer(8);
      mockOpenAI.audio.speech.create.mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(mockAudioData) });

      const result = await chatGPT.textToSpeech('Hello, this is a test.');
      expect(result).toEqual(mockAudioData);
      expect(mockOpenAI.audio.speech.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini-tts',
        voice: 'echo',
        instructions: expect.any(String),
        input: 'Hello, this is a test.',
      });
    });
  });
});

