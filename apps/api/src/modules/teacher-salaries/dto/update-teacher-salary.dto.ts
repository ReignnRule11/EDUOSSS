import { PartialType } from "@nestjs/swagger";

import { CreateTeacherSalaryDto } from "./create-teacher-salary.dto";

export class UpdateTeacherSalaryDto extends PartialType(
  CreateTeacherSalaryDto,
) {}
