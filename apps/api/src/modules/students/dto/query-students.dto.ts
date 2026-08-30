import { ApiPropertyOptional } from "@nestjs/swagger";
import { AcademicStatus, Gender } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryStudentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by school id" })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: AcademicStatus })
  @IsOptional()
  @IsEnum(AcademicStatus)
  academicStatus?: AcademicStatus;

  @ApiPropertyOptional({ example: "PRIMARY" })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: "Only active students" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  active?: boolean;
}
