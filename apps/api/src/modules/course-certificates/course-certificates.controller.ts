import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CourseCertificatesService } from "./course-certificates.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Certificates")
@ApiBearerAuth()
@Controller("certificates")
export class CourseCertificatesController {
  constructor(
    private readonly certificatesService: CourseCertificatesService,
  ) {}

  @Get()
  @Permissions(Permission.CERTIFICATE_READ)
  @ApiOperation({
    summary: "List certificates (staff see all; students see their own)",
  })
  @Cacheable({ ttl: 30 })
  findAll(@CurrentUser() actor: AuthPrincipal) {
    return this.certificatesService.findAll(actor);
  }

  @Get("verify")
  @Permissions(Permission.CERTIFICATE_READ)
  @ApiOperation({ summary: "Verify a certificate by its number" })
  verify(@Query("number") number: string) {
    return this.certificatesService.verify(number);
  }

  @Get(":id")
  @Permissions(Permission.CERTIFICATE_READ)
  @ApiOperation({ summary: "Get a certificate by id" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.certificatesService.findOne(id, actor);
  }
}

@ApiTags("Course Certificates")
@ApiBearerAuth()
@Controller("courses/:courseId/certificates")
export class CourseCertificatesByCourseController {
  constructor(
    private readonly certificatesService: CourseCertificatesService,
  ) {}

  @Get()
  @Permissions(Permission.CERTIFICATE_READ)
  @ApiOperation({ summary: "List certificates issued for a course" })
  findByCourse(@Param("courseId") courseId: string) {
    return this.certificatesService.findByCourse(courseId);
  }

  @Post("issue")
  @Permissions(Permission.CERTIFICATE_WRITE)
  @ApiOperation({ summary: "Issue a certificate for a completed enrollment" })
  @Audited({ action: AuditAction.CREATE, resource: "certificate" })
  issue(@Param("courseId") courseId: string, @Body() dto: IssueCertificateDto) {
    return this.certificatesService.issue(courseId, dto);
  }
}
