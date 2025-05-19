import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReadNewsStrategy from '../../../strategies/read-news-strategy.js';
import { fetchLatestNews } from '../../../services/read-news-fetch.js';

describe('ReadNewsStrategy', () => {
  let mockGenai;
  let mockStoreAudioFileTemp;

  beforeEach(() => {
    vi.mock('../../../services/read-news-fetch.js', () => ({
      fetchLatestNews: vi.fn(),
    }));
    mockGenai = {
      textToSpeech: vi.fn(),
    };
    mockStoreAudioFileTemp = {
      uploadAndGetTemporaryUrl: vi.fn(),
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  })

  it('should format text response when in test mode', async () => {
    const strategy = new ReadNewsStrategy(mockGenai, mockStoreAudioFileTemp);
    const parameters = { test: true };
    const mockContent = 'Latest news content';

    fetchLatestNews.mockResolvedValue(mockContent);

    const response = await strategy.execute(parameters);

    expect(response).toEqual({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Here is Jarvis for the news: ${mockContent}`,
        },
        shouldEndSession: true,
      },
    });
    expect(fetchLatestNews).toHaveBeenCalledWith(mockGenai);
  });

  it('should return audio response when not in test mode', async () => {
    const strategy = new ReadNewsStrategy(mockGenai, mockStoreAudioFileTemp);
    const parameters = { test: false };
    const mockContent = 'Latest news content';
    const mockAudioBuffer = new ArrayBuffer();
    const mockUrl = 'http://example.com/audio.mp3';
    const mockKey = 'audio-key';

    fetchLatestNews.mockResolvedValue(mockContent);
    mockGenai.textToSpeech.mockResolvedValue(mockAudioBuffer);
    mockStoreAudioFileTemp.uploadAndGetTemporaryUrl.mockResolvedValue({ url: mockUrl, key: mockKey });

    const response = await strategy.execute(parameters);

    expect(response).toEqual({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: `Here is Jarvis for the news: `,
        },
        directives: [
          {
            type: 'AudioPlayer.Play',
            playBehavior: 'REPLACE_ALL',
            audioItem: {
              stream: {
                token: expect.stringContaining('this-is-the-audio-token-'),
                url: mockUrl,
                offsetInMilliseconds: 2500,
              },
            },
          },
        ],
        shouldEndSession: true,
      },
    });
    expect(fetchLatestNews).toHaveBeenCalledWith(mockGenai);
    expect(mockGenai.textToSpeech).toHaveBeenCalledWith(mockContent);
    expect(mockStoreAudioFileTemp.uploadAndGetTemporaryUrl).toHaveBeenCalledWith(expect.any(Buffer));
  });
});

