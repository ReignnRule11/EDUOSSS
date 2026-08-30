import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;

  @ApiPropertyOptional({ description: "Filter by exact role" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "Active flag (true/false)" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  active?: boolean;
}
