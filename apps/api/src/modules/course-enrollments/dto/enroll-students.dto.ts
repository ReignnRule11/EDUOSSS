import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class EnrollStudentsDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      "Student ids to enroll. Omit to enroll the calling student themselves.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds?: string[];
}

export class UpdateLessonProgressDto {
  @ApiPropertyOptional({
    description:
      "Lesson status. COMPLETED marks the lesson done for the enrollment.",
  })
  @IsOptional()
  @IsString()
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

  @ApiPropertyOptional({ description: "Playback position in seconds" })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: "Manual progress percentage (0-100)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  progressPercent?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
