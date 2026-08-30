import { ApiPropertyOptional } from "@nestjs/swagger";
import { TimelineEventType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTimelineDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ enum: TimelineEventType })
  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  from?: Date;

  @ApiPropertyOptional({ example: "2027-07-31" })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? new Date(value) : value,
  )
  to?: Date;
}
