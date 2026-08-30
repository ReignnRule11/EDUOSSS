import { PartialType } from "@nestjs/swagger";

import { CreateDisciplineRecordDto } from "./create-discipline-record.dto";

export class UpdateDisciplineRecordDto extends PartialType(
  CreateDisciplineRecordDto,
) {}
