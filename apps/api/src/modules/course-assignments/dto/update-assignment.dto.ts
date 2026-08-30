import { PartialType } from "@nestjs/swagger";

import { CreateAssignmentDto } from "./assignment.dto";

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}
