import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ChatStrategy from "../../../strategies/chat-strategy.js";

describe("ChatStrategy", () => {
  let chatStrategy;
  let mockGenai;

  beforeEach(() => {
    mockGenai = {
      chatQuery: vi.fn(),
    };
    chatStrategy = new ChatStrategy(mockGenai);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("should return a response based on the input", async () => {
      const mockInput = "Hello, how are you?";
      const mockResponse = "I am fine, thank you!";

      mockGenai.chatQuery.mockResolvedValueOnce(mockResponse);

      const result = await chatStrategy.execute({ userQuery: mockInput });
      expect(result).toEqual({
        version: "1.0",
        response: {
          outputSpeech: {
            type: "PlainText",
            text: `jarvis responded: ${mockResponse}`,
          },
          shouldEndSession: false,
        },
      });

      expect(mockGenai.chatQuery).toHaveBeenCalledWith(
        expect.any(String),
        mockInput,
      );
    });

    it("should handle errors gracefully", async () => {
      const mockInput = "Hello!";
      const mockError = new Error("Processing error");

      mockGenai.chatQuery.mockRejectedValue(mockError);

      await expect(chatStrategy.execute(mockInput)).rejects.toThrow(
        "Processing error",
      );
    });
  });
});
