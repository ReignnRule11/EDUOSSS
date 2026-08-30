import { AuthPrincipal } from "@eduos/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { LmsEnrollmentStatus, Prisma } from "@prisma/client";

import type {
  CreateAssignmentDto,
  GradeSubmissionDto,
  SubmitAssignmentDto,
} from "./dto/assignment.dto";
import type { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import {
  ForbiddenOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseAssignmentsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    courseId: string,
    dto: CreateAssignmentDto,
    actor: AuthPrincipal,
  ) {
    await this.ensureCourse(courseId);
    return this.prisma.scoped.courseAssignment.create({
      data: this.withTenant({
        courseId,
        createdById: actor.userId,
        title: dto.title,
        instructions: dto.instructions,
        lessonId: dto.lessonId,
        dueAt: dto.dueAt,
        maxScore: dto.maxScore ?? 100,
      } as Prisma.CourseAssignmentUncheckedCreateInput),
      include: this.assignmentInclude,
    });
  }

  async findAll(courseId: string, student?: boolean) {
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.courseAssignment.findMany({
        where: this.tenantWhere({ courseId, deletedAt: null }),
        orderBy: [{ createdAt: "desc" }],
        include: student ? this.studentViewInclude() : this.assignmentInclude,
      }),
      this.prisma.scoped.courseAssignment.count({
        where: this.tenantWhere({ courseId, deletedAt: null }),
      }),
    ]);
    return { items, meta: { total: totalItems } };
  }

  async findOne(courseId: string, id: string) {
    const assignment = await this.prisma.scoped.courseAssignment.findFirst({
      where: this.tenantWhere({ id, courseId, deletedAt: null }),
      include: this.assignmentInclude,
    });
    if (!assignment) throw new ResourceNotFoundException("Assignment", id);
    return assignment;
  }

  async update(courseId: string, id: string, dto: UpdateAssignmentDto) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.courseAssignment.update({
      where: { id },
      data: dto as Prisma.CourseAssignmentUpdateInput,
      include: this.assignmentInclude,
    });
  }

  async remove(courseId: string, id: string): Promise<void> {
    await this.findOne(courseId, id);
    await this.prisma.scoped.courseAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async submit(
    courseId: string,
    assignmentId: string,
    dto: SubmitAssignmentDto,
    actor: AuthPrincipal,
  ) {
    await this.findOne(courseId, assignmentId);
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

    return this.prisma.scoped.assignmentSubmission.upsert({
      where: {
        assignmentId_enrollmentId: {
          assignmentId,
          enrollmentId: enrollment.id,
        },
      },
      create: this.withTenant({
        assignmentId,
        enrollmentId: enrollment.id,
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        submittedAt: new Date(),
      } as Prisma.AssignmentSubmissionUncheckedCreateInput),
      update: {
        content: dto.content,
        attachmentUrl: dto.attachmentUrl,
        submittedAt: new Date(),
      },
      include: this.submissionInclude,
    });
  }

  async listSubmissions(courseId: string, assignmentId: string) {
    await this.findOne(courseId, assignmentId);
    const items = await this.prisma.scoped.assignmentSubmission.findMany({
      where: this.tenantWhere({ assignmentId }),
      orderBy: { submittedAt: "desc" },
      include: this.submissionInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async grade(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
    actor: AuthPrincipal,
  ) {
    await this.findOne(courseId, assignmentId);
    const submission = await this.prisma.scoped.assignmentSubmission.findFirst({
      where: this.tenantWhere({ id: submissionId, assignmentId }),
    });
    if (!submission) {
      throw new ResourceNotFoundException("AssignmentSubmission", submissionId);
    }
    if (actor.role === "STUDENT" || actor.role === "PARENT") {
      throw new ForbiddenOperationException(
        "Only instructors and staff can grade submissions",
      );
    }
    return this.prisma.scoped.assignmentSubmission.update({
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

  /** For student views: include the calling student's own submission. */
  private studentViewInclude(): Prisma.CourseAssignmentInclude {
    return {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lesson: { select: { id: true, title: true } },
    };
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

  private get assignmentInclude(): Prisma.CourseAssignmentInclude {
    return {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      lesson: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
    };
  }

  private get submissionInclude(): Prisma.AssignmentSubmissionInclude {
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
