import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({ description: "Opaque token from the verification email link" })
  @IsString()
  @MinLength(16)
  token: string;
}
