import { ApiPropertyOptional } from "@nestjs/swagger";
import { TeacherAttendanceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTeacherAttendanceDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ enum: TeacherAttendanceStatus })
  @IsOptional()
  @IsEnum(TeacherAttendanceStatus)
  status?: TeacherAttendanceStatus;

  @ApiPropertyOptional({
    description: "Start date (ISO)",
    example: "2025-01-01",
  })
  @IsOptional()
  @Type(() => Date)
  dateFrom?: string;

  @ApiPropertyOptional({ description: "End date (ISO)", example: "2025-12-31" })
  @IsOptional()
  @Type(() => Date)
  dateTo?: string;
}
