import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ReviewTeacherLeaveRequestDto {
  @ApiProperty({ example: "Approved. Enjoy your leave." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  remarks: string;
}
