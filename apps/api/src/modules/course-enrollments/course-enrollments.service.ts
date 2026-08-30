import { AuthPrincipal } from "@eduos/shared";
import { Injectable, BadRequestException } from "@nestjs/common";
import {
  LessonProgressStatus,
  LmsEnrollmentStatus,
  Prisma,
} from "@prisma/client";

import type { EnrollStudentsDto } from "./dto/enroll-students.dto";
import type { UpdateLessonProgressDto } from "./dto/enroll-students.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseEnrollmentsService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async enroll(courseId: string, dto: EnrollStudentsDto, actor: AuthPrincipal) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);

    let studentIds = dto.studentIds ?? [];
    if (studentIds.length === 0) {
      const student = await this.findStudentByUser(actor.userId);
      studentIds = [student.id];
    }

    const created: unknown[] = [];
    for (const studentId of studentIds) {
      const existing = await this.prisma.scoped.courseEnrollment.findFirst({
        where: this.tenantWhere({ courseId, studentId }),
      });
      if (existing) {
        if (existing.status === LmsEnrollmentStatus.DROPPED) {
          await this.prisma.scoped.courseEnrollment.update({
            where: { id: existing.id },
            data: { status: LmsEnrollmentStatus.ACTIVE, completedAt: null },
          });
        }
        continue;
      }
      created.push(
        await this.prisma.scoped.courseEnrollment.create({
          data: this.withTenant({
            courseId,
            studentId,
            status: LmsEnrollmentStatus.ACTIVE,
            progressPercent: 0,
          } as Prisma.CourseEnrollmentUncheckedCreateInput),
        }),
      );
    }
    return { enrolled: created.length, total: studentIds.length };
  }

  async findAll(courseId: string) {
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.courseEnrollment.findMany({
        where: this.tenantWhere({ courseId }),
        orderBy: { enrolledAt: "desc" },
        include: this.enrollmentInclude,
      }),
      this.prisma.scoped.courseEnrollment.count({
        where: this.tenantWhere({ courseId }),
      }),
    ]);
    return {
      items,
      meta: { total: totalItems },
    };
  }

  async findOne(courseId: string, id: string) {
    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({ id, courseId }),
      include: this.progressInclude,
    });
    if (!enrollment) {
      throw new ResourceNotFoundException("CourseEnrollment", id);
    }
    return enrollment;
  }

  async drop(courseId: string, id: string) {
    await this.findOne(courseId, id);
    return this.prisma.scoped.courseEnrollment.update({
      where: { id },
      data: { status: LmsEnrollmentStatus.DROPPED, completedAt: null },
      include: this.enrollmentInclude,
    });
  }

  /** All enrollments of the calling student (with course + progress). */
  async findMine(actor: AuthPrincipal) {
    const student = await this.findStudentByUser(actor.userId);
    const items = await this.prisma.scoped.courseEnrollment.findMany({
      where: this.tenantWhere({ studentId: student.id }),
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            thumbnailUrl: true,
            level: true,
            instructor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: { select: { lessonProgress: true } },
      },
    });
    return { items, meta: { total: items.length } };
  }

  /** Detailed progress of the calling student for one course. */
  async findMineForCourse(courseId: string, actor: AuthPrincipal) {
    const student = await this.findStudentByUser(actor.userId);
    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({ courseId, studentId: student.id }),
      include: this.progressInclude,
    });
    if (!enrollment) {
      throw new ResourceNotFoundException(
        "CourseEnrollment",
        `student ${student.id} in course ${courseId}`,
      );
    }
    return enrollment;
  }

  /** Marks lesson progress for the calling student and recomputes course % */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto,
    actor: AuthPrincipal,
  ) {
    const student = await this.findStudentByUser(actor.userId);
    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({ courseId, studentId: student.id }),
    });
    if (!enrollment) {
      throw new BadRequestException("You are not enrolled in this course");
    }
    const lesson = await this.prisma.scoped.courseLesson.findFirst({
      where: this.tenantWhere({ id: lessonId, courseId, deletedAt: null }),
    });
    if (!lesson) throw new ResourceNotFoundException("Lesson", lessonId);

    const status: LessonProgressStatus =
      dto.completed === true
        ? LessonProgressStatus.COMPLETED
        : (dto.status ?? LessonProgressStatus.IN_PROGRESS);

    const progress = await this.prisma.scoped.courseLessonProgress.upsert({
      where: {
        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId },
      },
      create: this.withTenant({
        enrollmentId: enrollment.id,
        lessonId,
        status,
        progressPercent:
          status === LessonProgressStatus.COMPLETED
            ? 100
            : (dto.progressPercent ?? 0),
        lastPosition: dto.position,
        completedAt:
          status === LessonProgressStatus.COMPLETED ? new Date() : null,
      } as Prisma.CourseLessonProgressUncheckedCreateInput),
      update: {
        status,
        ...(dto.progressPercent !== undefined
          ? { progressPercent: dto.progressPercent }
          : {}),
        ...(status === LessonProgressStatus.COMPLETED
          ? { progressPercent: 100, completedAt: new Date() }
          : {}),
        ...(dto.position !== undefined ? { lastPosition: dto.position } : {}),
      },
    });

    await this.recomputeProgress(enrollment.id, courseId);
    return progress;
  }

  private async recomputeProgress(enrollmentId: string, courseId: string) {
    const [totalLessons, completed] = await this.prisma.$transaction([
      this.prisma.scoped.courseLesson.count({
        where: this.tenantWhere({ courseId, deletedAt: null }),
      }),
      this.prisma.scoped.courseLessonProgress.count({
        where: this.tenantWhere({
          enrollmentId,
          status: LessonProgressStatus.COMPLETED,
        }),
      }),
    ]);

    const progressPercent =
      totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
    const isComplete = totalLessons > 0 && progressPercent >= 100;

    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({ id: enrollmentId }),
    });
    if (!enrollment) return;

    await this.prisma.scoped.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPercent,
        status: isComplete
          ? LmsEnrollmentStatus.COMPLETED
          : LmsEnrollmentStatus.ACTIVE,
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (isComplete && enrollment.status !== LmsEnrollmentStatus.COMPLETED) {
      await this.issueCertificateIfMissing(enrollment);
    }
  }

  private async issueCertificateIfMissing(
    enrollment: Prisma.CourseEnrollmentGetPayload<object>,
  ) {
    const existing = await this.prisma.scoped.certificate.findFirst({
      where: this.tenantWhere({ enrollmentId: enrollment.id }),
    });
    if (existing) return;

    await this.prisma.scoped.certificate.create({
      data: this.withTenant({
        courseId: enrollment.courseId,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        certificateNumber: this.certificateNumber(),
        issuedAt: new Date(),
        earnedScore: enrollment.progressPercent,
      } as Prisma.CertificateUncheckedCreateInput),
    });
  }

  private certificateNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `CERT-${year}-${rand}`;
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

  private get enrollmentInclude(): Prisma.CourseEnrollmentInclude {
    return {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          guardianEmail: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      certificate: true,
    };
  }

  private get progressInclude(): Prisma.CourseEnrollmentInclude {
    return {
      ...this.enrollmentInclude,
      lessonProgress: {
        orderBy: { updatedAt: "desc" },
        include: {
          lesson: {
            select: { id: true, title: true, orderIndex: true },
          },
        },
      },
    };
  }
}
