import { ApiPropertyOptional } from "@nestjs/swagger";
import { QualificationLevel } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTeacherQualificationsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ enum: QualificationLevel })
  @IsOptional()
  @IsEnum(QualificationLevel)
  level?: QualificationLevel;
}
