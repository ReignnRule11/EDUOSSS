import { PartialType } from "@nestjs/swagger";

import { CreateTeacherDocumentDto } from "./create-teacher-document.dto";

export class UpdateTeacherDocumentDto extends PartialType(
  CreateTeacherDocumentDto,
) {}
