import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { LocalStorageDriver } from "./local-storage.driver";
import { S3StorageDriver } from "./s3-storage.driver";
import type { StorageDriver } from "./storage.interface";

export const STORAGE_DRIVER_TOKEN = "STORAGE_DRIVER";

@Global()
@Module({
  providers: [
    LocalStorageDriver,
    S3StorageDriver,
    {
      provide: STORAGE_DRIVER_TOKEN,
      inject: [ConfigService, LocalStorageDriver, S3StorageDriver],
      useFactory: (
        config: ConfigService,
        local: LocalStorageDriver,
        s3: S3StorageDriver,
      ): StorageDriver => {
        return config.get<string>("storage.driver") === "s3" ? s3 : local;
      },
    },
  ],
  exports: [STORAGE_DRIVER_TOKEN],
})
export class StorageModule {}
