import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AWS from "aws-sdk";
import StoreAudioFileTemp from "../../../services/store-audio-file-temp.js";

vi.mock("aws-sdk");

describe("StoreAudioFileTemp", () => {
  let s3Client;
  let storeAudioFileTemp;

  beforeEach(() => {
    s3Client = new AWS.S3();
    storeAudioFileTemp = new StoreAudioFileTemp(s3Client, "test-bucket");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadAndGetTemporaryUrl", () => {
    it("should upload audio file and return a temporary URL", async () => {
      const mockMp3Buffer = Buffer.from("mock audio data");
      const mockUploadResult = {
        Location: "https://mock-s3-url.com/temp-audio.mp3",
      };
      const mockSignedUrl =
        "https://mock-s3-url.com/temp-audio.mp3?temp-signed-url";

      s3Client.upload = vi
        .fn()
        .mockReturnValue({
          promise: vi.fn().mockResolvedValue(mockUploadResult),
        });
      s3Client.getSignedUrl = vi.fn().mockReturnValue(mockSignedUrl);

      const result =
        await storeAudioFileTemp.uploadAndGetTemporaryUrl(mockMp3Buffer);

      expect(s3Client.upload).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: expect.stringContaining("temp-audio-"),
        Body: mockMp3Buffer,
        ContentType: "audio/mp3",
      });
      expect(result).toEqual({
        url: mockSignedUrl,
        key: expect.stringContaining("temp-audio-"),
      });
    });

    it("should throw an error if upload fails", async () => {
      const mockMp3Buffer = Buffer.from("mock audio data");
      const mockError = new Error("Upload failed");

      s3Client.upload = vi
        .fn()
        .mockReturnValue({ promise: vi.fn().mockRejectedValue(mockError) });

      await expect(
        storeAudioFileTemp.uploadAndGetTemporaryUrl(mockMp3Buffer),
      ).rejects.toThrow("Upload failed");
    });
  });
});
