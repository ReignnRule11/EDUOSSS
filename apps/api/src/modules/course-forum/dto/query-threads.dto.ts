import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryThreadsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Only pinned threads" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  pinned?: boolean;
}
