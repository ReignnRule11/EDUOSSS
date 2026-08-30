import { Module } from "@nestjs/common";

import { TeacherSalariesController } from "./teacher-salaries.controller";
import { TeacherSalariesService } from "./teacher-salaries.service";

@Module({
  controllers: [TeacherSalariesController],
  providers: [TeacherSalariesService],
})
export class TeacherSalariesModule {}
