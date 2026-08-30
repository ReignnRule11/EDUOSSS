import { ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QuerySchoolsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SchoolType })
  @IsOptional()
  @IsIn(Object.values(SchoolType))
  type?: SchoolType;

  @ApiPropertyOptional({ description: "Filter by active state" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  isActive?: boolean;
}
