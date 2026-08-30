import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Weekday } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTimetableSlotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classGroupId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: "startTime must be in 24h HH:mm format",
  })
  startTime: string;

  @ApiProperty({ example: "08:45" })
  @IsString()
  @Matches(TIME_PATTERN, {
    message: "endTime must be in 24h HH:mm format",
  })
  endTime: string;

  @ApiPropertyOptional({ example: "P4A" })
  @IsOptional()
  @IsString()
  room?: string;
}
