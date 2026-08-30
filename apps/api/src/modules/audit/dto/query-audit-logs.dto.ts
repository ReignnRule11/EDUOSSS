import { ApiPropertyOptional } from "@nestjs/swagger";
import { AuditAction } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryAuditLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ example: "student" })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: "From date (ISO)" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "To date (ISO)" })
  @IsOptional()
  @IsString()
  to?: string;
}
