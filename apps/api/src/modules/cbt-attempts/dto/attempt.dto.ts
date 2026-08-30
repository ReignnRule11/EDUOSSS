import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExamAttemptStatus } from "@prisma/client";
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class StartAttemptDto {
  @ApiPropertyOptional({ example: "Picked this attempt to study chapter 5" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AutosaveAttemptDto {
  @ApiProperty({
    description:
      "Partial answers keyed by questionId. MCQ: optionId, TRUE_FALSE: boolean, FILL_BLANK: string[], MATCHING: {leftId:rightId}, ESSAY: string",
  })
  @IsObject()
  answers: Record<string, unknown>;
}

export class SubmitAttemptDto {
  @ApiProperty({
    description: "Final answers keyed by questionId (same shapes as autosave)",
  })
  @IsObject()
  answers: Record<string, unknown>;
}

export class GradeEssaysDto {
  @ApiProperty({
    description:
      "Essay scores keyed by questionId (must reference essay questions of the attempt)",
  })
  @IsObject()
  essayScores: Record<string, number>;
}

export class QueryAttemptsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExamAttemptStatus })
  @IsOptional()
  @IsEnum(ExamAttemptStatus)
  status?: ExamAttemptStatus;
}
