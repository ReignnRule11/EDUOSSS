import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import type { Prisma, EnrollmentStatus } from "@prisma/client";
import { GradeTerm, ResultStatus } from "@prisma/client";

import type {
  CreateResultScaleDto,
  CreateTermResultDto,
  QueryTermResultsDto,
  SaveSubjectScoresDto,
  UpdateResultScaleDto,
  UpdateTermResultCommentsDto,
  UpsertScaleEntriesDto,
} from "./dto/result.dto";
import { computeSubject } from "./result-computation.util";
import {
  BadRequestOperationException,
  ForbiddenOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import {
  createPdfDocument,
  pdfLine,
  pdfTitle,
} from "../../common/utils/pdf.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ResultProcessingService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Grading scales (custom grading) ----------------

  async createScale(dto: CreateResultScaleDto) {
    return this.prisma.scoped.resultScale.create({
      data: this.withTenant({
        name: dto.name,
        description: dto.description,
        entries: dto.entries
          ? {
              create: dto.entries.map((e) =>
                this.withTenant({
                  ...e,
                } as Prisma.ResultScaleEntryUncheckedCreateInput),
              ),
            }
          : undefined,
      } as Prisma.ResultScaleUncheckedCreateInput),
      include: this.scaleInclude,
    });
  }

  async listScales() {
    const items = await this.prisma.scoped.resultScale.findMany({
      where: this.tenantWhere({ deletedAt: null }),
      orderBy: { createdAt: "desc" },
      include: this.scaleInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async getScale(id: string) {
    const scale = await this.prisma.scoped.resultScale.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: this.scaleInclude,
    });
    if (!scale) throw new ResourceNotFoundException("ResultScale", id);
    return scale;
  }

  async updateScale(id: string, dto: UpdateResultScaleDto) {
    await this.getScale(id);
    return this.prisma.scoped.resultScale.update({
      where: { id },
      data: dto as Prisma.ResultScaleUpdateInput,
      include: this.scaleInclude,
    });
  }

  async upsertScaleEntries(id: string, dto: UpsertScaleEntriesDto) {
    await this.getScale(id);
    await this.prisma.scoped.resultScaleEntry.deleteMany({
      where: this.tenantWhere({ scaleId: id }),
    });
    await this.prisma.scoped.resultScaleEntry.createMany({
      data: dto.entries.map((e) => ({
        tenantId: this.tenantId(),
        scaleId: id,
        minScore: e.minScore,
        maxScore: e.maxScore,
        letterGrade: e.letterGrade,
        gpa: e.gpa,
        remark: e.remark,
      })),
    });
    return this.getScale(id);
  }

  async removeScale(id: string): Promise<void> {
    await this.getScale(id);
    await this.prisma.scoped.resultScale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------- Term results ----------------

  async createTermResult(dto: CreateTermResultDto) {
    await this.assertStudentInClass(dto.studentId, dto.classGroupId);
    const existing = await this.prisma.scoped.termResult.findFirst({
      where: this.tenantWhere({
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
      }),
    });
    if (existing)
      throw new BadRequestOperationException("Term result already exists");

    return this.prisma.scoped.termResult.create({
      data: this.withTenant({
        studentId: dto.studentId,
        classGroupId: dto.classGroupId,
        academicYear: dto.academicYear,
        term: dto.term,
        caWeight: dto.caWeight ?? 0.3,
        examWeight: dto.examWeight ?? 0.7,
      } as Prisma.TermResultUncheckedCreateInput),
      include: this.resultInclude,
    });
  }

  async findAll(query: QueryTermResultsDto, actor?: AuthPrincipal) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.TermResultWhereInput = {
      deletedAt: null,
      ...(query.classGroupId ? { classGroupId: query.classGroupId } : {}),
      ...(query.academicYear ? { academicYear: query.academicYear } : {}),
      ...(query.term ? { term: query.term } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };
    if (actor && this.isViewerRole(actor.role)) {
      const student = await this.findStudentByUser(actor.userId);
      where.studentId = student.id;
    }
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.termResult.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "average",
          "totalScore",
          "createdAt",
          "academicYear",
        ]) as Prisma.TermResultOrderByWithRelationInput,
        include: this.resultInclude,
      }),
      this.prisma.scoped.termResult.count({ where: this.tenantWhere(where) }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async getTermResult(id: string, actor?: AuthPrincipal) {
    const result = await this.prisma.scoped.termResult.findFirst({
      where: this.tenantWhere({ id, deletedAt: null }),
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        classGroup: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        subjects: {
          orderBy: { subject: { name: "asc" } },
          include: {
            subject: {
              select: { id: true, name: true, code: true, credits: true },
            },
          },
        },
      },
    });
    if (!result) throw new ResourceNotFoundException("TermResult", id);

    if (actor && this.isViewerRole(actor.role)) {
      const student = await this.findStudentByUser(actor.userId);
      if (result.studentId !== student.id) {
        throw new ResourceNotFoundException("TermResult", id);
      }
    }
    return result;
  }

  async saveScores(id: string, dto: SaveSubjectScoresDto) {
    const result = await this.getTermResult(id);
    if (result.status !== ResultStatus.DRAFT) {
      throw new BadRequestOperationException(
        "Scores can only be edited while the result is in DRAFT",
      );
    }
    const subjectIds = dto.scores.map((s) => s.subjectId);
    const subjects = await this.prisma.scoped.subject.findMany({
      where: this.tenantWhere({ id: { in: subjectIds }, deletedAt: null }),
      select: { id: true },
    });
    if (subjects.length !== new Set(subjectIds).size) {
      throw new BadRequestOperationException(
        "One or more subjects are invalid",
      );
    }

    const scale = await this.getActiveScale();
    for (const score of dto.scores) {
      const computed = computeSubject(
        {
          subjectId: score.subjectId,
          caScore: score.caScore ?? null,
          examScore: score.examScore ?? null,
        },
        scale,
        result.caWeight,
        result.examWeight,
      );
      await this.prisma.scoped.subjectResult.upsert({
        where: {
          tenantId_termResultId_subjectId: {
            tenantId: this.tenantId(),
            termResultId: id,
            subjectId: score.subjectId,
          },
        },
        create: this.withTenant({
          termResultId: id,
          subjectId: score.subjectId,
          caScore: score.caScore ?? null,
          examScore: score.examScore ?? null,
          totalScore: computed.totalScore,
          letterGrade: computed.letterGrade,
          gpa: computed.gpa,
          remark: computed.remark,
        } as Prisma.SubjectResultUncheckedCreateInput),
        update: {
          caScore: score.caScore ?? null,
          examScore: score.examScore ?? null,
          totalScore: computed.totalScore,
          letterGrade: computed.letterGrade,
          gpa: computed.gpa,
          remark: computed.remark,
        },
      });
    }

    return this.recompute(id);
  }

  /** Recomputes totals, averages, letter grades and class position. */
  async recompute(id: string) {
    const result = await this.getTermResult(id);
    const subjects = await this.prisma.scoped.subjectResult.findMany({
      where: this.tenantWhere({ termResultId: id }),
      orderBy: { subject: { name: "asc" } },
      include: { subject: { select: { id: true, name: true, code: true } } },
    });

    const scale = await this.getActiveScale();
    const computed = subjects.map((s) =>
      computeSubject(
        {
          subjectId: s.subjectId,
          caScore: s.caScore,
          examScore: s.examScore,
        },
        scale,
        result.caWeight,
        result.examWeight,
      ),
    );

    const scored = computed.filter((c) => c.totalScore !== null);
    const totalScore = scored.reduce((sum, c) => sum + (c.totalScore ?? 0), 0);
    const totalMaxScore = computed.length * 100;
    const average = scored.length > 0 ? totalScore / scored.length : null;

    // Persist recomputed subject rows.
    for (const c of computed) {
      await this.prisma.scoped.subjectResult.update({
        where: {
          tenantId_termResultId_subjectId: {
            tenantId: this.tenantId(),
            termResultId: id,
            subjectId: c.subjectId,
          },
        },
        data: {
          totalScore: c.totalScore,
          letterGrade: c.letterGrade,
          gpa: c.gpa,
          remark: c.remark,
        },
      });
    }

    // Class position among same class/year/term results.
    const siblings = await this.prisma.scoped.termResult.findMany({
      where: this.tenantWhere({
        classGroupId: result.classGroupId,
        academicYear: result.academicYear,
        term: result.term,
        status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
      }),
      select: { id: true, average: true, totalScore: true },
    });
    const ranked = siblings
      .map((s) => ({ ...s, avg: s.average ?? 0 }))
      .sort((a, b) => b.avg - a.avg);
    const index = ranked.findIndex((s) => s.id === id);
    const classPosition = index >= 0 ? index + 1 : null;
    const classSize = ranked.length || null;

    return this.prisma.scoped.termResult.update({
      where: { id },
      data: {
        totalScore: totalScore || null,
        totalMaxScore: totalMaxScore || null,
        average: average !== null ? Number(average.toFixed(2)) : null,
        classPosition,
        classSize,
      },
      include: this.resultInclude,
    });
  }

  async updateComments(id: string, dto: UpdateTermResultCommentsDto) {
    const result = await this.getTermResult(id);
    const data: Prisma.TermResultUpdateInput = {};
    if (dto.teacherComment !== undefined)
      data.teacherComment = dto.teacherComment;
    if (dto.principalComment !== undefined)
      data.principalComment = dto.principalComment;
    void result;
    return this.prisma.scoped.termResult.update({
      where: { id },
      data,
      include: this.resultInclude,
    });
  }

  async submit(id: string) {
    await this.getTermResult(id);
    return this.prisma.scoped.termResult.update({
      where: { id },
      data: { status: ResultStatus.SUBMITTED },
      include: this.resultInclude,
    });
  }

  async approve(id: string, actor: AuthPrincipal) {
    const result = await this.getTermResult(id);
    if (result.status === ResultStatus.DRAFT) {
      throw new BadRequestOperationException(
        "Submit the result before approving it",
      );
    }
    return this.prisma.scoped.termResult.update({
      where: { id },
      data: {
        status: ResultStatus.APPROVED,
        approvedById: actor.userId,
        approvedAt: new Date(),
      },
      include: this.resultInclude,
    });
  }

  async release(id: string) {
    const result = await this.getTermResult(id);
    if (result.status !== ResultStatus.APPROVED) {
      throw new BadRequestOperationException(
        "Only approved results can be released",
      );
    }
    return this.prisma.scoped.termResult.update({
      where: { id },
      data: { status: ResultStatus.RELEASED },
      include: this.resultInclude,
    });
  }

  // ---------------- Broadsheet, ranking ----------------

  async broadsheet(
    classGroupId: string,
    academicYear: string,
    term: GradeTerm,
    actor?: AuthPrincipal,
  ) {
    await this.assertClassAccess(classGroupId, actor);
    const classGroup = await this.prisma.scoped.classGroup.findFirst({
      where: this.tenantWhere({ id: classGroupId, deletedAt: null }),
      include: { subjects: { include: { subject: true } } },
    });
    if (!classGroup)
      throw new ResourceNotFoundException("ClassGroup", classGroupId);

    const results = await this.prisma.scoped.termResult.findMany({
      where: this.tenantWhere({
        classGroupId,
        academicYear,
        term,
        deletedAt: null,
      }),
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { average: "desc" },
    });

    const subjectOrder = classGroup.subjects
      .map((s) => s.subject)
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = results.map((r) => {
      const bySubject: Record<
        string,
        { totalScore: number | null; letterGrade: string | null }
      > = {};
      for (const s of r.subjects) {
        bySubject[s.subjectId] = {
          totalScore: s.totalScore,
          letterGrade: s.letterGrade,
        };
      }
      return {
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        admissionNumber: r.student.admissionNumber,
        status: r.status,
        average: r.average,
        totalScore: r.totalScore,
        classPosition: r.classPosition,
        subjects: bySubject,
      };
    });

    return {
      classGroupId,
      classGroupName: classGroup.name,
      academicYear,
      term,
      subjects: subjectOrder.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      })),
      rows,
      meta: { total: rows.length },
    };
  }

  async ranking(
    classGroupId: string,
    academicYear: string,
    term: GradeTerm,
    actor?: AuthPrincipal,
  ) {
    await this.assertClassAccess(classGroupId, actor);
    const results = await this.prisma.scoped.termResult.findMany({
      where: this.tenantWhere({
        classGroupId,
        academicYear,
        term,
        deletedAt: null,
        status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
      }),
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { average: "desc" },
    });
    return {
      classGroupId,
      academicYear,
      term,
      items: results.map((r, index) => ({
        position: index + 1,
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        admissionNumber: r.student.admissionNumber,
        average: r.average,
        totalScore: r.totalScore,
        status: r.status,
      })),
      meta: { total: results.length },
    };
  }

  /** Cumulative transcript across all academic years/terms for a student. */
  async transcript(studentId: string, actor?: AuthPrincipal) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ id: studentId, deletedAt: null }),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
    });
    if (!student) throw new ResourceNotFoundException("Student", studentId);

    if (actor && this.isViewerRole(actor.role)) {
      const viewer = await this.findStudentByUser(actor.userId);
      if (viewer.id !== student.id) {
        throw new ResourceNotFoundException("Student", studentId);
      }
    }

    const results = await this.prisma.scoped.termResult.findMany({
      where: this.tenantWhere({
        studentId,
        deletedAt: null,
        status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
      }),
      include: {
        classGroup: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ academicYear: "asc" }, { term: "asc" }],
    });

    const allTerms = results.length;
    const avg = results.filter((r) => r.average !== null);
    const cumulativeAverage =
      avg.length > 0
        ? avg.reduce((s, r) => s + (r.average ?? 0), 0) / avg.length
        : null;

    return {
      student,
      cumulativeAverage:
        cumulativeAverage !== null
          ? Number(cumulativeAverage.toFixed(2))
          : null,
      termsCount: allTerms,
      results,
    };
  }

  // ---------------- PDF export ----------------

  async exportReportCardPdf(
    id: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const result = await this.getTermResult(id);
    const { doc, end, done } = await createPdfDocument();

    pdfTitle(doc, "Report Card");
    pdfLine(
      doc,
      `Student: ${result.student.firstName} ${result.student.lastName} (${result.student.admissionNumber})`,
    );
    pdfLine(
      doc,
      `Class: ${result.classGroup.name} | ${result.academicYear} | ${result.term}`,
    );
    pdfLine(doc, `Status: ${result.status}`);
    if (result.average !== null) pdfLine(doc, `Average: ${result.average}`);
    if (result.classPosition)
      pdfLine(
        doc,
        `Position: ${result.classPosition} of ${result.classSize ?? "?"}`,
      );
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10).fillColor("#555");
    doc.text("Subject", 50, tableTop);
    doc.text("CA", 320, tableTop);
    doc.text("Exam", 380, tableTop);
    doc.text("Total", 440, tableTop);
    doc.text("Grade", 500, tableTop);
    doc.moveDown(1.2);

    for (const s of result.subjects) {
      doc.text(s.subject.name, 50);
      doc.text(s.caScore?.toString() ?? "-", 320);
      doc.text(s.examScore?.toString() ?? "-", 380);
      doc.text(s.totalScore?.toString() ?? "-", 440);
      doc.text(s.letterGrade ?? "-", 500);
      doc.moveDown(0.8);
    }

    if (result.teacherComment) {
      doc.moveDown();
      doc.fontSize(10).text(`Teacher comment: ${result.teacherComment}`);
    }
    if (result.principalComment) {
      doc.text(`Principal comment: ${result.principalComment}`);
    }

    end();
    return {
      pdf: await done,
      filename: `report-card-${result.student.admissionNumber}-${result.term}.pdf`,
    };
  }

  async exportTranscriptPdf(
    studentId: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const data = await this.transcript(studentId);
    const { doc, end, done } = await createPdfDocument();

    pdfTitle(doc, "Academic Transcript");
    pdfLine(
      doc,
      `Student: ${data.student.firstName} ${data.student.lastName} (${data.student.admissionNumber})`,
    );
    if (data.cumulativeAverage !== null)
      pdfLine(doc, `Cumulative Average: ${data.cumulativeAverage}`);
    pdfLine(doc, `Terms covered: ${data.termsCount}`);
    doc.moveDown();

    for (const term of data.results) {
      doc
        .fontSize(12)
        .fillColor("#1e3a5f")
        .text(`${term.academicYear} - ${term.term} (${term.classGroup.name})`);
      doc.fontSize(10).fillColor("#333");
      for (const s of term.subjects) {
        doc.text(
          `${s.subject.name}: ${s.totalScore ?? "-"} (${s.letterGrade ?? "-"})`,
        );
      }
      if (term.average !== null) doc.text(`Average: ${term.average}`);
      doc.moveDown(0.8);
    }

    end();
    return {
      pdf: await done,
      filename: `transcript-${data.student.admissionNumber}.pdf`,
    };
  }

  // ---------------- helpers ----------------

  /**
   * Enforces class-scoped access for broadsheet/ranking endpoints.
   * Viewers (STUDENT/PARENT) are always denied; teachers may only access
   * classes they head or teach; other staff/admins may access any class.
   */
  private async assertClassAccess(classGroupId: string, actor?: AuthPrincipal) {
    if (!actor) return;
    if (this.isViewerRole(actor.role)) {
      throw new ForbiddenOperationException(
        "Class-wide results are not available to your role",
      );
    }
    if (actor.role === "TEACHER") {
      const teacher = await this.prisma.scoped.teacher.findFirst({
        where: this.tenantWhere({ userId: actor.userId, deletedAt: null }),
        select: { id: true },
      });
      if (!teacher) {
        throw new ForbiddenOperationException("No teacher profile linked");
      }
      const allowed = await this.prisma.scoped.classGroup.findFirst({
        where: this.tenantWhere({
          id: classGroupId,
          OR: [
            { headTeacherId: teacher.id },
            { subjects: { some: { teacherId: teacher.id } } },
          ],
        }),
        select: { id: true },
      });
      if (!allowed) {
        throw new ForbiddenOperationException("You do not teach this class");
      }
    }
  }

  private async getActiveScale() {
    const scale = await this.prisma.scoped.resultScale.findFirst({
      where: this.tenantWhere({ isActive: true, deletedAt: null }),
      include: { entries: true },
      orderBy: { createdAt: "desc" },
    });
    return scale;
  }

  private async findStudentByUser(userId: string) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ userId }),
    });
    if (!student) {
      throw new BadRequestOperationException(
        "No student profile is linked to your account",
      );
    }
    return student;
  }

  private isViewerRole(role: string): boolean {
    return role === "STUDENT" || role === "PARENT";
  }

  private async assertStudentInClass(studentId: string, classGroupId: string) {
    const enrollment = await this.prisma.scoped.enrollment.findFirst({
      where: this.tenantWhere({
        studentId,
        classGroupId,
        status: "ACTIVE" as EnrollmentStatus,
      }),
      select: { id: true },
    });
    if (!enrollment) {
      throw new BadRequestOperationException(
        "Student is not actively enrolled in this class",
      );
    }
  }

  private get scaleInclude(): Prisma.ResultScaleInclude {
    return {
      entries: { orderBy: { minScore: "asc" } },
    };
  }

  private get resultInclude(): Prisma.TermResultInclude {
    return {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      },
      classGroup: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      subjects: {
        orderBy: { subject: { name: "asc" } },
        include: {
          subject: {
            select: { id: true, name: true, code: true, credits: true },
          },
        },
      },
    };
  }
}
