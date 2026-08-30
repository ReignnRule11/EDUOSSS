import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class QueryReportsDto {
  @ApiPropertyOptional({ description: "Restrict reports to a school id" })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: "Restrict reports to an academic year" })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ description: "Attendance window days", default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  windowDays: number = 30;
}
