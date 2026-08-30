import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ description: "Opaque token from the reset email link" })
  @IsString()
  @MinLength(16)
  token: string;

  @ApiProperty({
    example: "NewStrongPass123!",
    description: "At least 8 chars with upper, lower and a digit/symbol",
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "password must contain at least one uppercase letter, one lowercase letter and one number",
  })
  newPassword: string;
}
