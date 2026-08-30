import type { AuthPrincipal } from "@eduos/shared";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { LmsEnrollmentStatus, ResultStatus } from "@prisma/client";

import type { QueryMessagesDto, SendMessageDto } from "./dto/parent-portal.dto";
import {
  BadRequestOperationException,
  ResourceNotFoundException,
} from "../../common/exceptions/business.exceptions";
import { BaseRepository } from "../../common/repositories/base.repository";
import {
  buildOrderBy,
  buildPaginationMeta,
  toPaginationArgs,
} from "../../common/utils/pagination.util";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ParentPortalService extends BaseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ---------------- Children ----------------

  /** Resolves the parent's children via Guardian.email matching. */
  async findChildren(actor: AuthPrincipal) {
    const guardians = await this.prisma.scoped.guardian.findMany({
      where: this.tenantWhere({ email: actor.email, deletedAt: null }),
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: LmsEnrollmentStatus.ACTIVE },
              include: { classGroup: true },
              take: 1,
            },
          },
        },
      },
    });
    const children = guardians
      .map((g) => g.student)
      .filter((s) => !s.deletedAt);
    return {
      items: children.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        photoUrl: s.photoUrl,
        className: s.enrollments[0]?.classGroup?.name ?? null,
        classGroupId: s.enrollments[0]?.classGroupId ?? null,
      })),
      meta: { total: children.length },
    };
  }

  /** Enforces that the parent actually has this child. */
  async assertChildAccess(childId: string, actor: AuthPrincipal) {
    const guardian = await this.prisma.scoped.guardian.findFirst({
      where: this.tenantWhere({
        email: actor.email,
        studentId: childId,
        deletedAt: null,
      }),
      select: { id: true },
    });
    if (!guardian) {
      throw new ResourceNotFoundException("Child", childId);
    }
  }

  private async getChild(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const student = await this.prisma.scoped.student.findFirst({
      where: this.tenantWhere({ id: childId, deletedAt: null }),
      include: {
        enrollments: {
          where: { status: LmsEnrollmentStatus.ACTIVE },
          include: { classGroup: true },
          orderBy: { academicYear: "desc" },
          take: 1,
        },
      },
    });
    if (!student) throw new ResourceNotFoundException("Student", childId);
    return student;
  }

  // ---------------- Per-child sections ----------------

  async childDashboard(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);

    const [attendance, results, invoices, assignments] = await Promise.all([
      this.prisma.scoped.attendanceRecord.aggregate({
        where: this.tenantWhere({ studentId: childId }),
        _count: true,
      }),
      this.prisma.scoped.termResult.findMany({
        where: this.tenantWhere({
          studentId: childId,
          deletedAt: null,
          status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
        }),
        orderBy: [{ academicYear: "desc" }, { term: "desc" }],
        take: 3,
        select: { id: true, academicYear: true, term: true, average: true },
      }),
      this.prisma.scoped.invoice.findMany({
        where: this.tenantWhere({
          studentId: childId,
          deletedAt: null,
          balanceAmount: { gt: 0 },
        }),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          balanceAmount: true,
          totalAmount: true,
        },
      }),
      this.prisma.scoped.courseEnrollment.findMany({
        where: this.tenantWhere({
          studentId: childId,
          status: LmsEnrollmentStatus.ACTIVE,
        }),
        include: {
          course: {
            include: {
              assignments: {
                where: { deletedAt: null },
                include: {
                  submissions: { where: { enrollmentId: childId } },
                },
              },
            },
          },
        },
      }),
    ]);

    const pendingAssignments = assignments.flatMap((enr) =>
      enr.course.assignments.filter((a) => a.submissions.length === 0),
    );
    const outstanding = invoices.reduce((s, i) => s + i.balanceAmount, 0);

    return {
      attendanceRecords: attendance._count,
      latestResults: results,
      outstandingFees: outstanding,
      pendingAssignments: pendingAssignments.length,
    };
  }

  async childAttendance(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const records = await this.prisma.scoped.attendanceRecord.findMany({
      where: this.tenantWhere({ studentId: childId }),
      orderBy: { date: "desc" },
      take: 30,
    });
    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    return {
      summary: {
        total,
        present,
        absent,
        late,
        presentRate:
          total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0,
      },
      records,
    };
  }

  async childResults(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const results = await this.prisma.scoped.termResult.findMany({
      where: this.tenantWhere({
        studentId: childId,
        deletedAt: null,
        status: { in: [ResultStatus.APPROVED, ResultStatus.RELEASED] },
      }),
      orderBy: [{ academicYear: "desc" }, { term: "desc" }],
      include: {
        classGroup: { select: { id: true, name: true } },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    return { items: results, meta: { total: results.length } };
  }

  async childAssignments(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const enrollments = await this.prisma.scoped.courseEnrollment.findMany({
      where: this.tenantWhere({
        studentId: childId,
        status: LmsEnrollmentStatus.ACTIVE,
      }),
      include: {
        course: {
          select: {
            id: true,
            title: true,
            assignments: {
              where: { deletedAt: null },
              orderBy: { dueAt: "asc" },
              include: {
                submissions: { where: { enrollmentId: childId } },
              },
            },
          },
        },
      },
    });
    const items = enrollments.flatMap((enr) =>
      enr.course.assignments.map((a) => ({
        id: a.id,
        courseId: enr.course.id,
        courseTitle: enr.course.title,
        title: a.title,
        instructions: a.instructions,
        dueAt: a.dueAt,
        maxScore: a.maxScore,
        status: a.submissions.length > 0 ? "SUBMITTED" : "PENDING",
        score: a.submissions[0]?.score ?? null,
        submittedAt: a.submissions[0]?.submittedAt ?? null,
      })),
    );
    return { items, meta: { total: items.length } };
  }

  async childPayments(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const [invoices, payments] = await Promise.all([
      this.prisma.scoped.invoice.findMany({
        where: this.tenantWhere({ studentId: childId, deletedAt: null }),
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      this.prisma.scoped.payment.findMany({
        where: this.tenantWhere({ studentId: childId }),
        orderBy: { createdAt: "desc" },
        include: { receipt: true },
      }),
    ]);
    return { invoices, payments, meta: { total: invoices.length } };
  }

  async childNotifications(childId: string, actor: AuthPrincipal) {
    await this.assertChildAccess(childId, actor);
    const items = await this.prisma.scoped.parentNotificationLog.findMany({
      where: this.tenantWhere({ studentId: childId }),
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, meta: { total: items.length } };
  }

  // ---------------- Teacher messaging ----------------

  async listMessages(actor: AuthPrincipal, query: QueryMessagesDto) {
    const pagination = toPaginationArgs(query);
    const where: Prisma.ParentMessageWhereInput = {
      OR: [{ senderId: actor.userId }, { receiverId: actor.userId }],
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.parentMessage.findMany({
        where: this.tenantWhere(where),
        skip: pagination.skip,
        take: pagination.take,
        orderBy: buildOrderBy(query, [
          "createdAt",
          "readAt",
        ]) as Prisma.ParentMessageOrderByWithRelationInput,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
          receiver: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.scoped.parentMessage.count({
        where: this.tenantWhere(where),
      }),
    ]);
    return {
      items,
      meta: buildPaginationMeta(totalItems, pagination.page, pagination.limit),
    };
  }

  async sendMessage(actor: AuthPrincipal, dto: SendMessageDto) {
    const receiver = await this.prisma.scoped.user.findFirst({
      where: this.tenantWhere({ id: dto.receiverId }),
      select: { id: true, role: true },
    });
    if (!receiver) throw new ResourceNotFoundException("User", dto.receiverId);

    const isParentOrStudent =
      actor.role === "PARENT" || actor.role === "STUDENT";
    if (isParentOrStudent) {
      await this.assertChildAccess(dto.studentId, actor);
      if (receiver.role === "PARENT" || receiver.role === "STUDENT") {
        throw new BadRequestOperationException(
          "You can only message a teacher",
        );
      }
    } else {
      // Teacher/staff can reply to a parent about a student.
      if (receiver.role !== "PARENT" && receiver.role !== "STUDENT") {
        throw new BadRequestOperationException(
          "Message must be addressed to the parent or student",
        );
      }
    }
    return this.prisma.scoped.parentMessage.create({
      data: this.withTenant({
        studentId: dto.studentId,
        senderId: actor.userId,
        receiverId: dto.receiverId,
        subject: dto.subject,
        body: dto.body,
      } as Prisma.ParentMessageUncheckedCreateInput),
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async markMessageRead(id: string, actor: AuthPrincipal) {
    const message = await this.prisma.scoped.parentMessage.findFirst({
      where: this.tenantWhere({ id, receiverId: actor.userId }),
    });
    if (!message) throw new ResourceNotFoundException("ParentMessage", id);
    if (!message.readAt) {
      return this.prisma.scoped.parentMessage.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return message;
  }

  async unreadCount(actor: AuthPrincipal) {
    const count = await this.prisma.scoped.parentMessage.count({
      where: this.tenantWhere({ receiverId: actor.userId, readAt: null }),
    });
    return { unread: count };
  }

  /** Teachers the parent can message: head teachers + class subject teachers. */
  async availableTeachers(childId: string, actor: AuthPrincipal) {
    const child = await this.getChild(childId, actor);
    const classGroupId = child.enrollments[0]?.classGroupId;
    if (!classGroupId) {
      return { items: [], meta: { total: 0 } };
    }
    const classGroup = await this.prisma.scoped.classGroup.findFirst({
      where: this.tenantWhere({ id: classGroupId }),
      include: {
        headTeacher: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        subjects: {
          include: {
            teacher: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });
    const items: Array<{
      userId: string;
      name: string;
      role: string;
      subject?: string;
    }> = [];
    if (classGroup?.headTeacher?.user) {
      items.push({
        userId: classGroup.headTeacher.user.id,
        name: `${classGroup.headTeacher.user.firstName} ${classGroup.headTeacher.user.lastName}`,
        role: "Head teacher",
      });
    }
    for (const cs of classGroup?.subjects ?? []) {
      if (cs.teacher?.user) {
        items.push({
          userId: cs.teacher.user.id,
          name: `${cs.teacher.user.firstName} ${cs.teacher.user.lastName}`,
          role: "Subject teacher",
          subject: cs.subject.name,
        });
      }
    }
    return { items, meta: { total: items.length } };
  }

  // ---------------- Announcements & profile ----------------

  async announcements(actor: AuthPrincipal) {
    void actor;
    const now = new Date();
    const items = await this.prisma.scoped.announcement.findMany({
      where: this.tenantWhere({
        isActive: true,
        deletedAt: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      }),
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { items, meta: { total: items.length } };
  }

  async profile(actor: AuthPrincipal) {
    const user = await this.prisma.scoped.user.findFirst({
      where: this.tenantWhere({ id: actor.userId }),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    });
    const guardians = await this.prisma.scoped.guardian.findMany({
      where: this.tenantWhere({ email: actor.email, deletedAt: null }),
      select: { id: true, firstName: true, lastName: true, relationship: true },
    });
    return { user, guardians };
  }
}
