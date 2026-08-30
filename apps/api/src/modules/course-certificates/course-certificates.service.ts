import { AuthPrincipal } from "@eduos/shared";
import { BadRequestException, Injectable } from "@nestjs/common";
import { LmsEnrollmentStatus, Prisma } from "@prisma/client";

import type { IssueCertificateDto } from "./dto/issue-certificate.dto";
import { ResourceNotFoundException } from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class CourseCertificatesService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** Issue a certificate manually once an enrollment is completed. */
  async issue(courseId: string, dto: IssueCertificateDto) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);

    const enrollment = await this.prisma.scoped.courseEnrollment.findFirst({
      where: this.tenantWhere({ courseId, studentId: dto.studentId }),
    });
    if (!enrollment) {
      throw new BadRequestException("Student is not enrolled in this course");
    }
    if (enrollment.status !== LmsEnrollmentStatus.COMPLETED) {
      throw new BadRequestException(
        "Certificate can only be issued after the course is completed",
      );
    }
    const existing = await this.prisma.scoped.certificate.findFirst({
      where: this.tenantWhere({ enrollmentId: enrollment.id }),
    });
    if (existing) return existing;

    return this.prisma.scoped.certificate.create({
      data: this.withTenant({
        courseId,
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        certificateNumber: this.certificateNumber(),
        issuedAt: new Date(),
        earnedScore: enrollment.progressPercent,
      } as Prisma.CertificateUncheckedCreateInput),
      include: this.certificateInclude,
    });
  }

  /** All certificates. Students/parents only see their own. */
  async findAll(actor: AuthPrincipal) {
    const isStaff = !["STUDENT", "PARENT"].includes(actor.role);
    const where: Prisma.CertificateWhereInput = isStaff
      ? {}
      : { studentId: (await this.studentOf(actor)).id };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.certificate.findMany({
        where: this.tenantWhere(where),
        orderBy: { issuedAt: "desc" },
        include: this.certificateInclude,
      }),
      this.prisma.scoped.certificate.count({
        where: this.tenantWhere(where),
      }),
    ]);
    return { items, meta: { total: totalItems } };
  }

  async findOne(id: string, actor: AuthPrincipal) {
    const certificate = await this.prisma.scoped.certificate.findFirst({
      where: this.tenantWhere({ id }),
      include: this.certificateInclude,
    });
    if (!certificate) {
      throw new ResourceNotFoundException("Certificate", id);
    }
    const isStaff = !["STUDENT", "PARENT"].includes(actor.role);
    if (
      !isStaff &&
      certificate.studentId !== (await this.studentOf(actor)).id
    ) {
      throw new BadRequestException(
        "You do not have access to this certificate",
      );
    }
    return certificate;
  }

  async findByCourse(courseId: string) {
    await this.ensureCourse(courseId);
    const items = await this.prisma.scoped.certificate.findMany({
      where: this.tenantWhere({ courseId }),
      orderBy: { issuedAt: "desc" },
      include: this.certificateInclude,
    });
    return { items, meta: { total: items.length } };
  }

  async verify(number: string) {
    const certificate = await this.prisma.scoped.certificate.findFirst({
      where: this.tenantWhere({ certificateNumber: number }),
      include: this.certificateInclude,
    });
    if (!certificate) {
      throw new ResourceNotFoundException("Certificate", number);
    }
    return { valid: true, certificate };
  }

  private certificateNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `CERT-${year}-${rand}`;
  }

  private async studentOf(actor: AuthPrincipal) {
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ userId: actor.userId }),
    });
    if (!student) {
      throw new BadRequestException(
        "No student profile is linked to your account",
      );
    }
    return student;
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.scoped.course.findFirst({
      where: this.tenantWhere({ id: courseId, deletedAt: null }),
    });
    if (!course) throw new ResourceNotFoundException("Course", courseId);
  }

  private get certificateInclude(): Prisma.CertificateInclude {
    return {
      course: {
        select: {
          id: true,
          title: true,
          summary: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          guardianName: true,
        },
      },
    };
  }
}
