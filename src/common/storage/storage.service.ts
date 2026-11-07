import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Every object this service writes is placed under this S3 "folder" (key prefix).
const ROOT_FOLDER = 'document_assistant';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('AWS_S3_BUCKET_NAME').trim();
    this.s3 = new S3Client({
      region: configService.getOrThrow<string>('AWS_S3_REGION').trim(),
      credentials: {
        accessKeyId: configService
          .getOrThrow<string>('AWS_S3_ACCESS_KEY')
          .trim(),
        secretAccessKey: configService
          .getOrThrow<string>('AWS_S3_SECRET_ACCESS_KEY')
          .trim(),
      },
    });
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const fullKey = this.withRootFolder(key);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return fullKey;
  }

  private withRootFolder(key: string): string {
    const relativeKey = key.replace(/^\/+/, '');
    return relativeKey.startsWith(`${ROOT_FOLDER}/`)
      ? relativeKey
      : `${ROOT_FOLDER}/${relativeKey}`;
  }
}
