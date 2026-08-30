import { Module } from "@nestjs/common";

import {
  ResultInsightsController,
  ResultScalesController,
  TermResultsController,
  TranscriptsController,
} from "./result-processing.controller";
import { ResultProcessingService } from "./result-processing.service";

@Module({
  controllers: [
    ResultScalesController,
    TermResultsController,
    ResultInsightsController,
    TranscriptsController,
  ],
  providers: [ResultProcessingService],
  exports: [ResultProcessingService],
})
export class ResultProcessingModule {}
