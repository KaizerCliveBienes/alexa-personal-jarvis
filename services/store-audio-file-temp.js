class StoreAudioFileTemp {
  constructor(s3Client, bucketName) {
    this.s3Client = s3Client;
    this.bucketName = bucketName;
    this.expirationSeconds = 300;
  }

  async uploadAndGetTemporaryUrl(mp3Buffer) {
    const s3Key = `temp-audio-${Date.now()}.mp3`;
    try {
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: mp3Buffer,
        ContentType: 'audio/mp3',
      };

      const uploadResult = await this.s3Client.upload(uploadParams).promise();
      console.info('File uploaded successfully:', uploadResult.Location);

      const signedUrlParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Expires: this.expirationSeconds
      };

      const temporaryUrl = this.s3Client.getSignedUrl('getObject', signedUrlParams);
      console.info('Temporary S3 URL:', temporaryUrl);

      return { url: temporaryUrl, key: s3Key };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }
}

export default StoreAudioFileTemp;
