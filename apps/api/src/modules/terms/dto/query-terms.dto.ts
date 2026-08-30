import { ApiPropertyOptional } from "@nestjs/swagger";
import { TermStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTermsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ enum: TermStatus })
  @IsOptional()
  @IsEnum(TermStatus)
  status?: TermStatus;

  @ApiPropertyOptional({ description: "Only the current term" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  currentOnly?: boolean;

  @ApiPropertyOptional({ description: "Include active state filter" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  isActive?: boolean;
}
