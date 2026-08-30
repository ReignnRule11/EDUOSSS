import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ description: "New 0-based position" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderLessonsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
