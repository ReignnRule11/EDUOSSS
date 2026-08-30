import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateThreadDto {
  @ApiProperty({ example: "Stuck on the CSS grid lesson" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: "The grid example in lesson 3 does not render..." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class CreateReplyDto {
  @ApiProperty({ example: "Try setting display:grid on the parent element." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}
