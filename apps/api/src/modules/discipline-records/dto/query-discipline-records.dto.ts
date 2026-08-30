import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  DisciplineCategory,
  DisciplineSeverity,
  DisciplineStatus,
} from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryDisciplineRecordsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: DisciplineCategory })
  @IsOptional()
  @IsEnum(DisciplineCategory)
  category?: DisciplineCategory;

  @ApiPropertyOptional({ enum: DisciplineSeverity })
  @IsOptional()
  @IsEnum(DisciplineSeverity)
  severity?: DisciplineSeverity;

  @ApiPropertyOptional({ enum: DisciplineStatus })
  @IsOptional()
  @IsEnum(DisciplineStatus)
  status?: DisciplineStatus;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  from?: Date;

  @ApiPropertyOptional({ example: "2027-12-31" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  to?: Date;
}
