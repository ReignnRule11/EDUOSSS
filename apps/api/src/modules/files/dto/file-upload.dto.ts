import { FileAccess } from "@eduos/shared";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export class FileUploadDto {
  @ApiProperty({ type: "string", format: "binary" })
  file: unknown;

  @ApiPropertyOptional({ enum: FileAccess, default: FileAccess.PRIVATE })
  @IsOptional()
  @IsEnum(FileAccess)
  access?: FileAccess;
}
