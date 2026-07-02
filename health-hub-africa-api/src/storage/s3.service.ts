import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

const PUT_URL_EXPIRY_SECONDS = 600; // 10 min
const GET_URL_EXPIRY_SECONDS = 300; // 5 min

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    // Static keys are optional — when absent the SDK default credential
    // provider chain resolves the ECS task role (or local AWS profile).
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      endpoint: config.get('S3_ENDPOINT'), // R2 endpoint if used
    });
    this.bucket = config.getOrThrow('S3_BUCKET');
  }

  /** Presigned PUT URL for direct client upload (10-minute expiry). */
  async presignPut(
    key: string,
    contentType: string,
    contentLength: number,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      ...(metadata ? { Metadata: metadata } : {}),
    });
    return getSignedUrl(this.s3, command, { expiresIn: PUT_URL_EXPIRY_SECONDS });
  }

  /** Presigned GET URL for direct client download (5-minute expiry). */
  async presignGet(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: GET_URL_EXPIRY_SECONDS });
  }

  /**
   * Fetches object metadata via HeadObjectCommand.
   *
   * Errors are NOT wrapped: when the object does not exist the AWS SDK
   * `NotFound` (404) error propagates to the caller, which decides how to
   * translate it (e.g. into an HTTP 404 or a validation failure).
   */
  async headObject(key: string): Promise<{ contentLength: number; contentType?: string }> {
    const head = await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      contentLength: head.ContentLength ?? 0,
      contentType: head.ContentType,
    };
  }

  /**
   * Deletes an object. Errors propagate to the caller — callers decide
   * whether a failed S3 delete should abort or merely be logged.
   */
  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
