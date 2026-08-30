import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class MfaConfirmDto {
  @ApiProperty({
    description: "TOTP code from the authenticator app",
    example: "123456",
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: "code must be a 6-digit number" })
  code: string;
}
