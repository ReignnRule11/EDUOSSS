import { PartialType } from "@nestjs/swagger";

import { CreateStudentTransferDto } from "./create-student-transfer.dto";

export class UpdateStudentTransferDto extends PartialType(
  CreateStudentTransferDto,
) {}
