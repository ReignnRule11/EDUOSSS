import { ApiPropertyOptional } from "@nestjs/swagger";
import { SessionStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryAcademicSessionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: "Only the current session" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  currentOnly?: boolean;

  @ApiPropertyOptional({ description: "Include active state filter" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  isActive?: boolean;
}
