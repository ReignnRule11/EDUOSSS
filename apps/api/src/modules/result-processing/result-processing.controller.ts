import { AuditAction, Permission } from "@eduos/shared";
import type { AuthPrincipal } from "@eduos/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GradeTerm } from "@prisma/client";
import type { Response } from "express";

import {
  CreateResultScaleDto,
  CreateTermResultDto,
  QueryTermResultsDto,
  SaveSubjectScoresDto,
  UpdateResultScaleDto,
  UpdateTermResultCommentsDto,
  UpsertScaleEntriesDto,
} from "./dto/result.dto";
import { ResultProcessingService } from "./result-processing.service";
import { Audited } from "../../common/decorators/audit.decorator";
import { Cacheable } from "../../common/decorators/cacheable.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";

@ApiTags("Result Processing: Grading Scales")
@ApiBearerAuth()
@Controller("result-scales")
export class ResultScalesController {
  constructor(private readonly resultsService: ResultProcessingService) {}

  @Post()
  @Permissions(Permission.RESULT_SCALE_WRITE)
  @ApiOperation({ summary: "Create a custom grading scale" })
  @Audited({ action: AuditAction.CREATE, resource: "result_scale" })
  create(@Body() dto: CreateResultScaleDto) {
    return this.resultsService.createScale(dto);
  }

  @Get()
  @Permissions(Permission.RESULT_SCALE_READ)
  @ApiOperation({ summary: "List grading scales" })
  @Cacheable({ ttl: 30 })
  list() {
    return this.resultsService.listScales();
  }

  @Get(":id")
  @Permissions(Permission.RESULT_SCALE_READ)
  @ApiOperation({ summary: "Get a grading scale" })
  findOne(@Param("id") id: string) {
    return this.resultsService.getScale(id);
  }

  @Patch(":id")
  @Permissions(Permission.RESULT_SCALE_WRITE)
  @ApiOperation({ summary: "Update a grading scale" })
  @Audited({ action: AuditAction.UPDATE, resource: "result_scale" })
  update(@Param("id") id: string, @Body() dto: UpdateResultScaleDto) {
    return this.resultsService.updateScale(id, dto);
  }

  @Patch(":id/entries")
  @Permissions(Permission.RESULT_SCALE_WRITE)
  @ApiOperation({ summary: "Replace the entries (boundaries) of a scale" })
  @Audited({ action: AuditAction.UPDATE, resource: "result_scale" })
  upsertEntries(@Param("id") id: string, @Body() dto: UpsertScaleEntriesDto) {
    return this.resultsService.upsertScaleEntries(id, dto);
  }

  @Delete(":id")
  @Permissions(Permission.RESULT_SCALE_WRITE)
  @ApiOperation({ summary: "Deactivate a grading scale" })
  @Audited({ action: AuditAction.DELETE, resource: "result_scale" })
  remove(@Param("id") id: string) {
    return this.resultsService.removeScale(id);
  }
}

@ApiTags("Result Processing: Term Results")
@ApiBearerAuth()
@Controller("term-results")
export class TermResultsController {
  constructor(private readonly resultsService: ResultProcessingService) {}

  @Post()
  @Permissions(Permission.RESULT_WRITE)
  @ApiOperation({ summary: "Create an empty term result for a student" })
  @Audited({ action: AuditAction.CREATE, resource: "term_result" })
  create(@Body() dto: CreateTermResultDto) {
    return this.resultsService.createTermResult(dto);
  }

  @Get()
  @Permissions(Permission.RESULT_READ)
  @ApiOperation({ summary: "List term results with filters" })
  @Cacheable({ ttl: 15 })
  findAll(
    @Query() query: QueryTermResultsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.resultsService.findAll(query, actor);
  }

  @Get(":id")
  @Permissions(Permission.RESULT_READ)
  @ApiOperation({ summary: "Get a term result (report card view)" })
  findOne(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.resultsService.getTermResult(id, actor);
  }

  @Get(":id/export")
  @Permissions(Permission.RESULT_EXPORT)
  @ApiOperation({ summary: "Download a report card as PDF" })
  async exportPdf(
    @Param("id") id: string,
    @CurrentUser() actor: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.resultsService.getTermResult(id, actor);
    const { pdf, filename } = await this.resultsService.exportReportCardPdf(
      result.id,
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(pdf);
  }

  @Post(":id/scores")
  @Permissions(Permission.RESULT_WRITE)
  @ApiOperation({ summary: "Save CA + exam scores for subjects (draft only)" })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  saveScores(@Param("id") id: string, @Body() dto: SaveSubjectScoresDto) {
    return this.resultsService.saveScores(id, dto);
  }

  @Post(":id/compute")
  @Permissions(Permission.RESULT_GRADE)
  @ApiOperation({
    summary: "Recompute grades, totals and class position",
  })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  compute(@Param("id") id: string) {
    return this.resultsService.recompute(id);
  }

  @Patch(":id/comments")
  @Permissions(Permission.RESULT_GRADE)
  @ApiOperation({ summary: "Set teacher / principal comments" })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  comments(@Param("id") id: string, @Body() dto: UpdateTermResultCommentsDto) {
    return this.resultsService.updateComments(id, dto);
  }

  @Post(":id/submit")
  @Permissions(Permission.RESULT_GRADE)
  @ApiOperation({ summary: "Submit a draft result for approval" })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  submit(@Param("id") id: string) {
    return this.resultsService.submit(id);
  }

  @Post(":id/approve")
  @Permissions(Permission.RESULT_APPROVE)
  @ApiOperation({ summary: "Approve a submitted result (principal)" })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  approve(@Param("id") id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.resultsService.approve(id, actor);
  }

  @Post(":id/release")
  @Permissions(Permission.RESULT_PUBLISH)
  @ApiOperation({ summary: "Release an approved result to students/parents" })
  @Audited({ action: AuditAction.UPDATE, resource: "term_result" })
  release(@Param("id") id: string) {
    return this.resultsService.release(id);
  }
}

@ApiTags("Result Processing: Broadsheet & Ranking")
@ApiBearerAuth()
@Controller("result-insights")
export class ResultInsightsController {
  constructor(private readonly resultsService: ResultProcessingService) {}

  @Get("broadsheet")
  @Permissions(Permission.RESULT_GRADE)
  @ApiOperation({ summary: "Class-wide broadsheet of subject scores (staff)" })
  broadsheet(
    @Query("classGroupId") classGroupId: string,
    @Query("academicYear") academicYear: string,
    @Query("term") term: GradeTerm,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.resultsService.broadsheet(
      classGroupId,
      academicYear,
      term,
      actor,
    );
  }

  @Get("ranking")
  @Permissions(Permission.RESULT_GRADE)
  @ApiOperation({ summary: "Class ranking of students by average (staff)" })
  ranking(
    @Query("classGroupId") classGroupId: string,
    @Query("academicYear") academicYear: string,
    @Query("term") term: GradeTerm,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.resultsService.ranking(classGroupId, academicYear, term, actor);
  }
}

@ApiTags("Result Processing: Transcripts")
@ApiBearerAuth()
@Controller("transcripts")
export class TranscriptsController {
  constructor(private readonly resultsService: ResultProcessingService) {}

  @Get(":studentId")
  @Permissions(Permission.RESULT_READ)
  @ApiOperation({ summary: "Cumulative transcript for a student" })
  transcript(
    @Param("studentId") studentId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.resultsService.transcript(studentId, actor);
  }

  @Get(":studentId/export")
  @Permissions(Permission.RESULT_EXPORT)
  @ApiOperation({ summary: "Download a student transcript as PDF" })
  async exportPdf(
    @Param("studentId") studentId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.resultsService.transcript(studentId, actor);
    const { pdf, filename } =
      await this.resultsService.exportTranscriptPdf(studentId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    return new StreamableFile(pdf);
  }
}
