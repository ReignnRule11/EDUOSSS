import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class VerifyMfaLoginDto {
  @ApiProperty({
    description: "MFA challenge token returned by a successful password login",
  })
  @IsString()
  mfaToken: string;

  @ApiProperty({
    description: "TOTP code or a single backup code",
    example: "123456",
  })
  @IsString()
  @Matches(/^[0-9A-Za-z-]+$/, {
    message: "code must contain only digits, letters and dashes",
  })
  code: string;
}
