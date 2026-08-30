import { Module } from "@nestjs/common";

import {
  CbtStaffAttemptsController,
  CbtStudentAttemptsController,
} from "./cbt-attempts.controller";
import { CbtAttemptsService } from "./cbt-attempts.service";

@Module({
  controllers: [CbtStaffAttemptsController, CbtStudentAttemptsController],
  providers: [CbtAttemptsService],
  exports: [CbtAttemptsService],
})
export class CbtAttemptsModule {}
