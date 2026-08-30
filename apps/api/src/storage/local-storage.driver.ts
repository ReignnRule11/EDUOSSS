import { access, mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  DownloadResult,
  StorageDriver,
  UploadParams,
  UploadResult,
} from "./storage.interface";

/**
 * Local filesystem driver used for development and small deployments.
 * Files are stored under the configured local root and served statically
 * at /storage.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = join(
      process.cwd(),
      config.get<string>("storage.localRoot") ?? "storage",
    );
    void this.ensureRoot();
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const filePath = join(this.root, params.key);
    const dir = filePath.slice(0, filePath.lastIndexOf("/"));
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, params.body);
    return { key: params.key, url: this.getPublicUrl(params.key) };
  }

  async download(key: string): Promise<DownloadResult> {
    const filePath = join(this.root, key);
    const body = await readFile(filePath);
    return { body, mimeType: "application/octet-stream" };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.root, key);
    try {
      await rm(filePath, { force: true });
    } catch (error) {
      this.logger.warn(
        `Local delete failed for ${key}: ${(error as Error).message}`,
      );
    }
  }

  getPublicUrl(key: string): string {
    return `/storage/${key}`;
  }

  private async ensureRoot(): Promise<void> {
    try {
      await access(this.root);
    } catch {
      await mkdir(this.root, { recursive: true });
    }
  }
}
