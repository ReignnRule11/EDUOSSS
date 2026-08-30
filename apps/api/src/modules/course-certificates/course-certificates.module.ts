import { Module } from "@nestjs/common";

import {
  CourseCertificatesByCourseController,
  CourseCertificatesController,
} from "./course-certificates.controller";
import { CourseCertificatesService } from "./course-certificates.service";

@Module({
  controllers: [
    CourseCertificatesController,
    CourseCertificatesByCourseController,
  ],
  providers: [CourseCertificatesService],
  exports: [CourseCertificatesService],
})
export class CourseCertificatesModule {}
