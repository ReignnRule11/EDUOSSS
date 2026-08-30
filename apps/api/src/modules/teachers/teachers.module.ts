import { Module } from "@nestjs/common";

import { TeachersController } from "./teachers.controller";
import { TeachersService } from "./teachers.service";
import { FilesModule } from "../files/files.module";

@Module({
  imports: [FilesModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
