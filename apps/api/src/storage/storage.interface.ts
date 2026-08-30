export interface UploadParams {
  key: string;
  body: Buffer;
  mimeType: string;
  access: "PUBLIC" | "PRIVATE";
}

export interface UploadResult {
  key: string;
  url: string;
  bucket?: string;
}

export interface DownloadResult {
  body: Buffer;
  mimeType: string;
}

/** Pluggable object-storage abstraction (local disk or S3-compatible). */
export interface StorageDriver {
  upload(params: UploadParams): Promise<UploadResult>;
  download(key: string): Promise<DownloadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
