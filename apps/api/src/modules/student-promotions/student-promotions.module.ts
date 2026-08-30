import { Module } from "@nestjs/common";

import { StudentPromotionsController } from "./student-promotions.controller";
import { StudentPromotionsService } from "./student-promotions.service";

@Module({
  controllers: [StudentPromotionsController],
  providers: [StudentPromotionsService],
})
export class StudentPromotionsModule {}
