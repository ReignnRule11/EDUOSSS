import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LiveClassStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateLiveClassDto {
  @ApiProperty({ example: "Week 3 Q&A session" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: "Drop-in session to review the module..." })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ type: String, format: "date-time" })
  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiPropertyOptional({ example: "https://meet.example.com/abc123" })
  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @ApiPropertyOptional({
    enum: LiveClassStatus,
    default: LiveClassStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(LiveClassStatus)
  status?: LiveClassStatus;
}

export class UpdateLiveClassStatusDto {
  @ApiProperty({ enum: LiveClassStatus })
  @IsEnum(LiveClassStatus)
  status: LiveClassStatus;
}
