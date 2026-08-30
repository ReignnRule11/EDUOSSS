import { ApiPropertyOptional } from "@nestjs/swagger";
import { CourseStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryCoursesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by course status" })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ description: "Filter by subject id" })
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional({ description: "Filter by instructor (teacher) id" })
  @IsOptional()
  @IsString()
  instructorId?: string;
}
