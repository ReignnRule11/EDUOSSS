import { Module } from "@nestjs/common";

import {
  CbtQuestionCategoriesController,
  CbtQuestionsController,
} from "./cbt-questions.controller";
import { CbtQuestionsService } from "./cbt-questions.service";

@Module({
  controllers: [CbtQuestionCategoriesController, CbtQuestionsController],
  providers: [CbtQuestionsService],
  exports: [CbtQuestionsService],
})
export class CbtQuestionsModule {}
