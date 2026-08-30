import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class IssueCertificateDto {
  @ApiProperty({ example: "ckx...student" })
  @IsString()
  @IsNotEmpty()
  studentId: string;
}
