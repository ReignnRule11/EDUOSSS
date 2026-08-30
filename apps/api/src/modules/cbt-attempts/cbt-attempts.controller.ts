import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { CbtAttemptsService } from "./cbt-attempts.service";
import {
  AutosaveAttemptDto,
  GradeEssaysDto,
  QueryAttemptsDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from "./dto/attempt.dto";
import { Audited } from "../../common/decorators/audit.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("CBT Exam Attempts (staff)")
@ApiBearerAuth()
@Controller("exams/:examId/attempts")
export class CbtStaffAttemptsController {
  constructor(private readonly attemptsService: CbtAttemptsService) {}

  @Get()
  @Permissions(Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "List attempts of an exam (staff)" })
  findAll(@Param("examId") examId: string, @Query() query: QueryAttemptsDto) {
    return this.attemptsService.findAllForExam(examId, query);
  }

  @Get("analytics")
  @Permissions(Permission.EXAM_ANALYTICS)
  @ApiOperation({ summary: "Aggregated analytics for an exam (staff)" })
  analytics(@Param("examId") examId: string) {
    return this.attemptsService.analytics(examId);
  }

  @Get(":id/export")
  @Permissions(Permission.EXAM_EXPORT, Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "Download an attempt result as PDF" })
  async export(
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { pdf, filename } = await this.attemptsService.exportPdf(id, actor);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(pdf);
  }

  @Get(":id")
  @Permissions(Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "Get an attempt detail (staff view)" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.attemptsService.attemptDetail(id, actor, false);
  }

  @Post()
  @Permissions(Permission.EXAM_ATTEMPT_WRITE)
  @ApiOperation({ summary: "Start (or resume) an attempt (student)" })
  @Audited({ action: AuditAction.CREATE, resource: "exam_attempt" })
  start(
    @Param("examId") examId: string,
    @Body() dto: StartAttemptDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.attemptsService.start(examId, actor, dto);
  }
}

@ApiTags("CBT Exam Attempts (student)")
@ApiBearerAuth()
@Controller("attempts")
export class CbtStudentAttemptsController {
  constructor(private readonly attemptsService: CbtAttemptsService) {}

  @Get("mine")
  @Permissions(Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "List the calling student's attempts" })
  findMine(
    @Query() query: QueryAttemptsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.attemptsService.findMine(actor, query);
  }

  @Get(":id")
  @Permissions(Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "Get own attempt detail" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.attemptsService.attemptDetail(id, actor, false);
  }

  @Get(":id/export")
  @Permissions(Permission.EXAM_ATTEMPT_READ)
  @ApiOperation({ summary: "Download own attempt result as PDF" })
  async export(
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { pdf, filename } = await this.attemptsService.exportPdf(id, actor);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(pdf);
  }

  @Post(":id/autosave")
  @Permissions(Permission.EXAM_ATTEMPT_WRITE)
  @ApiOperation({ summary: "Autosave partial answers (student)" })
  autosave(
    @Param("id") id: string,
    @Body() dto: AutosaveAttemptDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.attemptsService.autosave(id, actor, dto);
  }

  @Post(":id/submit")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Permissions(Permission.EXAM_ATTEMPT_WRITE)
  @ApiOperation({
    summary: "Submit an attempt; auto-graded instantly (essays await review)",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "exam_attempt" })
  submit(
    @Param("id") id: string,
    @Body() dto: SubmitAttemptDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.attemptsService.submit(id, actor, dto);
  }

  @Post(":id/grade")
  @Permissions(Permission.EXAM_GRADE)
  @ApiOperation({ summary: "Grade essay questions of an attempt (staff)" })
  @Audited({ action: AuditAction.UPDATE, resource: "exam_attempt" })
  grade(
    @Param("id") id: string,
    @Body() dto: GradeEssaysDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.attemptsService.gradeEssays(id, actor, dto);
  }
}
