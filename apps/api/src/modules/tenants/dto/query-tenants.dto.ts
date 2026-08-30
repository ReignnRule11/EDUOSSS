import { ApiPropertyOptional } from "@nestjs/swagger";
import { TenantStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryTenantsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsIn(Object.values(TenantStatus))
  status?: TenantStatus;

  @ApiPropertyOptional({ description: "Filter tenants by name" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name?: string;
}
