import { PartialType } from "@nestjs/swagger";

import { CreateHomeworkDto } from "./homework.dto";

export class UpdateHomeworkDto extends PartialType(CreateHomeworkDto) {}
