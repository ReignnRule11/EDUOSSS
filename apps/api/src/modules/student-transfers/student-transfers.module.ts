import { Module } from "@nestjs/common";

import { StudentTransfersController } from "./student-transfers.controller";
import { StudentTransfersService } from "./student-transfers.service";

@Module({
  controllers: [StudentTransfersController],
  providers: [StudentTransfersService],
})
export class StudentTransfersModule {}
