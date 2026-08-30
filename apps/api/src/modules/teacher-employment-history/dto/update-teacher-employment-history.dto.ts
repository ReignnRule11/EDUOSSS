import { PartialType } from "@nestjs/swagger";

import { CreateTeacherEmploymentHistoryDto } from "./create-teacher-employment-history.dto";

export class UpdateTeacherEmploymentHistoryDto extends PartialType(
  CreateTeacherEmploymentHistoryDto,
) {}
