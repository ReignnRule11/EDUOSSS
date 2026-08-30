import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

export class MfaDisableDto {
  @ApiPropertyOptional({
    description: "Current password (either password or code is required)",
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description:
      "TOTP code or backup code (either password or code is required)",
  })
  @IsOptional()
  @Matches(/^[0-9A-Za-z-]+$/, {
    message: "code must contain only digits, letters and dashes",
  })
  code?: string;
}
