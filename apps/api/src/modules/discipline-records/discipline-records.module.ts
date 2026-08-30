import { Module } from "@nestjs/common";

import { DisciplineRecordsController } from "./discipline-records.controller";
import { DisciplineRecordsService } from "./discipline-records.service";

@Module({
  controllers: [DisciplineRecordsController],
  providers: [DisciplineRecordsService],
})
export class DisciplineRecordsModule {}
