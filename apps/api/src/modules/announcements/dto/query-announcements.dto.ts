import { ApiPropertyOptional } from "@nestjs/swagger";
import { AnnouncementAudience } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryAnnouncementsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AnnouncementAudience })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @ApiPropertyOptional({ description: "Only pinned announcements" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  pinned?: boolean;

  @ApiPropertyOptional({ description: "Include active state filter" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  isActive?: boolean;
}
