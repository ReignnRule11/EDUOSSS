import { PartialType } from "@nestjs/swagger";

import { CreateStudentPromotionDto } from "./create-student-promotion.dto";

export class UpdateStudentPromotionDto extends PartialType(
  CreateStudentPromotionDto,
) {}
