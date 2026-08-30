import { Module } from "@nestjs/common";

import { CbtExamsController } from "./cbt-exams.controller";
import { CbtExamsService } from "./cbt-exams.service";

@Module({
  controllers: [CbtExamsController],
  providers: [CbtExamsService],
  exports: [CbtExamsService],
})
export class CbtExamsModule {}
