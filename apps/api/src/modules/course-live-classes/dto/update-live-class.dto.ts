import { PartialType } from "@nestjs/swagger";

import { CreateLiveClassDto } from "./live-class.dto";

export class UpdateLiveClassDto extends PartialType(CreateLiveClassDto) {}
