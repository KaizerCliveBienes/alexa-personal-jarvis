import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { fetchLatestNews } from "../../../services/read-news-fetch.js";
import fetch from "node-fetch";
import config from "../../../config/config.js";

describe("fetchLatestNews", () => {
  const genaiMock = {
    chatQuery: vi.fn().mockResolvedValue("summary response"),
  };

  beforeEach(() => {
    vi.mock("node-fetch");
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and summarize news successfully", async () => {
    const mockResponse = `
      <rss>
        <channel>
          <item>
            <title>News Title 1</title>
            <description>News Description 1</description>
          </item>
          <item>
            <title>News Title 2</title>
            <description>News Description 2</description>
          </item>
        </channel>
      </rss>
    `;

    fetch.mockResolvedValue({
      status: 200,
      ok: true,
      text: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await fetchLatestNews(genaiMock);

    expect(result).toBe("summary response");
    expect(genaiMock.chatQuery).toHaveBeenCalledWith(
      config.readNews.chatQuery,
      expect.any(String),
    );
  });

  it("should throw an error on failed fetch response", async () => {
    fetch.mockResolvedValueOnce({
      status: 500,
      ok: false,
    });

    await expect(fetchLatestNews(genaiMock)).rejects.toThrow(
      "Can't fetch from Manila Times",
    );
  });

  it("should handle parsing errors", async () => {
    fetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      text: vi.fn().mockResolvedValueOnce("invalid xml"),
    });

    await expect(fetchLatestNews(genaiMock)).rejects.toThrow();
  });
});
