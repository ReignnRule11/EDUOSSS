import { Global, Logger, Module } from "@nestjs/common";

import { MailService } from "./mail.service";

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {
  private readonly logger = new Logger(MailModule.name);
}
