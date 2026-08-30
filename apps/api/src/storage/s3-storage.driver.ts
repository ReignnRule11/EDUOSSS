import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  DownloadResult,
  StorageDriver,
  UploadParams,
  UploadResult,
} from "./storage.interface";

/**
 * S3-compatible object storage driver (AWS S3, MinIO, R2, GCS interop...).
 * Uses path-style addressing so it works with MinIO out of the box.
 */
@Injectable()
export class S3StorageDriver implements StorageDriver {
  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly forcePathStyle: boolean;

  constructor(config: ConfigService) {
    const s3 = config.get("storage.s3");
    this.bucket = s3.bucket;
    this.endpoint = s3.endpoint;
    this.forcePathStyle = s3.forcePathStyle;
    this.client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint || undefined,
      forcePathStyle: s3.forcePathStyle,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.mimeType,
        ...(params.access === "PUBLIC" ? { ACL: "public-read" } : {}),
      }),
    );
    return {
      key: params.key,
      url: this.getPublicUrl(params.key),
      bucket: this.bucket,
    };
  }

  async download(key: string): Promise<DownloadResult> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) {
      throw new Error(`S3 object has no body: ${key}`);
    }
    const body = await result.Body.transformToByteArray();
    return {
      body: Buffer.from(body),
      mimeType: result.ContentType ?? "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.warn(
        `S3 delete failed for ${key}: ${(error as Error).message}`,
      );
    }
  }

  getPublicUrl(key: string): string {
    if (this.forcePathStyle) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    const host = this.endpoint.replace(/^https?:\/\//, "");
    return `https://${this.bucket}.${host}/${key}`;
  }
}
