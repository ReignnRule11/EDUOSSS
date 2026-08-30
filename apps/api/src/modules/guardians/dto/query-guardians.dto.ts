import { ApiPropertyOptional } from "@nestjs/swagger";
import { GuardianRelationship } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryGuardiansDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: GuardianRelationship })
  @IsOptional()
  @IsEnum(GuardianRelationship)
  relationship?: GuardianRelationship;
}
