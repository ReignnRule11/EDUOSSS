import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class DailyReportQueryDto {
  @ApiPropertyOptional({ type: String, format: "date", default: "today" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @ApiPropertyOptional({ description: "Filter to a single class" })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ description: "Filter by school" })
  @IsOptional()
  @IsString()
  schoolId?: string;
}

export class MonthlyReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: "date",
    default: "start of month",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: "date", default: "today" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({ description: "Filter to a single class" })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiPropertyOptional({ description: "Filter by school" })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class LateArrivalsQueryDto {
  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classGroupId?: string;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 365, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: "date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
