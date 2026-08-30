import { PartialType } from "@nestjs/swagger";

import { CreateRecordedSessionDto } from "./recorded-session.dto";

export class UpdateRecordedSessionDto extends PartialType(
  CreateRecordedSessionDto,
) {}
