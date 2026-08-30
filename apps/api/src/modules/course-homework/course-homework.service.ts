import { AuthPrincipal } from "@eduos/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { LmsEnrollmentStatus, Prisma } from "@prisma/client";

import type {
  CreateHomeworkDto,
  GradeHomeworkDto,
  SubmitHomeworkDto,
} from "./dto/homework.dto";
import type { UpdateHomeworkDto } from "./dto/update-homework.dto";
import {
  ForbiddenOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseHomeworkService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(courseId: string, dto: CreateHomeworkDto, actor: AuthPrincipal) {
    await this.ensureCourse(courseId);
    return this.prisma.scoped.courseHomework.create({
      data: this.withTenant({
        courseId,
        createdById: actor.userId,
        title: dto.title,
        instructions: dto.instructions,
        lessonId: dto.lessonId,
        dueAt: dto.dueAt,
        maxScore: dto.maxScore ?? 100,
      } as Prisma.CourseHomeworkUncheckedCreateInput),
      include: this.homeworkInclude,
    });
  }

  async findAll(courseId: string) {
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.courseHomework.findMany({
        where: this.tenantWhere({ courseId, deletedAt: null }),
        orderBy: [{ createdAt: "desc" }],
        include: this.homeworkInclude,
      }),
      this.prisma.scoped.courseHomework.count({
        where: this.tenantWhere({ courseId, deletedAt: null }),
      }),
    ]);
    return { items, meta: { total: totalItems } };
  }

  async findOne(courseId: string, id: string) {
    const homework = await this.prisma.scoped.courseHomework.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
      include: this.homeworkInclude,
    });
    if (!homework) throw new ResourceNotFoundException("Homework", id);
    return homework;
  }

  async update(courseId: string, id: string, dto: UpdateHomeworkDto) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.courseHomework.update({
      where: { id },
      data: dto as Prisma.CourseHomeworkUpdateInput,
      include: this.homeworkInclude,
    });
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.findOne(courseId, id);
    await this.prisma.scoped.courseHomework.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async submit(
    courseId: string,
    homeworkId: string,
    dto: SubmitHomeworkDto,
    actor: AuthPrincipal,
  ) {
    await this.findOne(courseId, homeworkId);
    const student = await this.findStudentByUser(actor.userId);
    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({
        courseId,
        studentId: student.id,
        status: { not: LmsEnrollmentStatus.DROPPED },
      }),
    });
    if (!enrollment) {
      throw new BadRequestException(
        "You must be enrolled in this course to submit",
      );
    }

    return this.prisma.scoped.homeworkSubmission.upsert({
      where: {
        homeworkId_enrollmentId: {
          homeworkId,
          enrollmentId: enrollment.id,
        },
      },
      create: this.withTenant({
        homeworkId,
        enrollmentId: enrollment.id,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        submittedAt: new Date(),
      } as Prisma.HomeworkSubmissionUncheckedCreateInput),
      update: {
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        submittedAt: new Date(),
      },
      include: this.submissionInclude,
    });
  }

  async listSubmissions(courseId: string, homeworkId: string) {
    await this.findOne(courseId, homeworkId);
    const items = await this.prisma.scoped.homeworkSubmission.findMany({
      where: this.tenantWhere({ homeworkId }),
      orderBy: { submittedAt: "desc" },
      include: this.submissionInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async grade(
    courseId: string,
    homeworkId: string,
    submissionId: string,
    dto: GradeHomeworkDto,
    actor: AuthPrincipal,
  ) {
    await this.findOne(courseId, homeworkId);
    const submission = await this.prisma.scoped.homeworkSubmission.findFirst({
      where: this.tenantWhere({ id: submissionId, homeworkId }),
    });
    if (!submission) {
      throw new ResourceNotFoundException("HomeworkSubmission", submissionId);
    }
    if (actor.role === "STUDENT" || actor.role === "PARENT") {
      throw new ForbiddenOperationException(
        "Only instructors and staff can grade homework",
      );
    }
    return this.prisma.scoped.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        gradedById: actor.userId,
        gradedAt: new Date(),
        status: "GRADED",
      },
      include: this.submissionInclude,
    });
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);
  }

  private async findStudentByUser(userId: string) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ userId }),
    });
    if (!student) {
      throw new BadRequestException(
        "No student profile is linked to your account",
      );
    }
    return student;
  }

  private get homeworkInclude(): Prisma.CourseHomeworkInclude {
    return {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lesson: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
    };
  }

  private get submissionInclude(): Prisma.HomeworkSubmissionInclude {
    return {
      enrollment: {
        select: {
          id: true,
          student: {
            select: {
              id: true,
              admissionNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      gradedBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
