import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TimelineEventType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateTimelineEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: TimelineEventType })
  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @ApiProperty({ example: "Student status changed to ACTIVE" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;
}
