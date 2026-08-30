import { Injectable } from "@nestjs/common";
import { AttendanceStatus, type Prisma } from "@prisma/client";

import type { NotifyParentsDto } from "./dto/notify-parents.dto";
import { BaseRepository } from "../../common/repositories/base.repository";
import { PrismaService } from "../../database/prisma.service";
import { MailService } from "../mail/mail.service";

interface NotifyTarget {
  recordId: string;
  studentId: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  status: AttendanceStatus;
  recipient: string | null;
  recipientName: string;
}

@Injectable()
export class AttendanceNotificationService extends BaseRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super();
  }

  async notifyAbsent(dto: NotifyParentsDto) {
    const date = this.normalizeDate(dto.date ?? new Date());
    const conditions: Prisma.AttendanceRecordWhereInput[] = [
      { date, status: { in: ["ABSENT", "LATE"] } },
    ];
    if (dto.classGroupId) conditions.push({ classGroupId: dto.classGroupId });
    if (dto.studentId) conditions.push({ studentId: dto.studentId });
    if (dto.status) conditions.push({ status: dto.status });

    const records = await this.prisma.scoped.attendanceRecord.findMany({
      where: { AND: conditions },
      include: {
        student: {
          include: { guardians: { where: { isPrimary: true }, take: 1 } },
        },
        classGroup: { select: { name: true } },
      },
    });

    const targets: NotifyTarget[] = records.map((r) => {
      const guardian = r.student.guardians[0];
      const recipientEmail = guardian?.email ?? r.student.guardianEmail;
      const recipientName = guardian
        ? `${guardian.firstName} ${guardian.lastName}`
        : (r.student.guardianName ?? "Guardian");
      return {
        recordId: r.id,
        studentId: r.student.id,
        admissionNumber: r.student.admissionNumber,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        className: r.classGroup?.name ?? "",
        status: r.status,
        recipient: recipientEmail ?? null,
        recipientName,
      };
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const notifications: Array<{
      studentId: string;
      studentName: string;
      status: string;
      channel: string;
      recipient: string | null;
      delivered: string;
    }> = [];

    for (const target of targets) {
      const subject = this.subjectFor(target);
      const body = this.bodyFor(target, date);
      const outcome: {
        status: string;
        error?: string;
        recipient: string | null;
        channel: string;
      } = { status: "SENT", recipient: null, channel: "EMAIL" };

      if (!target.recipient) {
        outcome.status = "SKIPPED";
        outcome.error = "No guardian email on file";
        skipped += 1;
      } else {
        outcome.recipient = target.recipient;
        try {
          await this.mail.send({
            to: target.recipient,
            subject,
            text: body,
            html: this.toHtml(body),
          });
          sent += 1;
        } catch (err) {
          outcome.status = "FAILED";
          outcome.error = err instanceof Error ? err.message : String(err);
          failed += 1;
        }
      }

      await this.prisma.scoped.parentNotificationLog.create({
        data: {
          tenantId: this.tenantId(),
          studentId: target.studentId,
          recordId: target.recordId,
          channel: outcome.status === "SKIPPED" ? "SMS" : "EMAIL",
          recipient: outcome.recipient,
          subject,
          body,
          status: outcome.status,
          ...(outcome.error ? { error: outcome.error.slice(0, 500) } : {}),
        },
      });

      notifications.push({
        studentId: target.studentId,
        studentName: target.studentName,
        status: target.status,
        channel: outcome.channel,
        recipient: outcome.recipient,
        delivered: outcome.status,
      });
    }

    return {
      date,
      matched: records.length,
      sent,
      failed,
      skipped,
      notifications,
    };
  }

  async listLogs(query: { limit?: number; studentId?: string }) {
    const where: Prisma.ParentNotificationLogWhereInput = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.scoped.parentNotificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200),
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
      }),
      this.prisma.scoped.parentNotificationLog.count({ where }),
    ]);
    return { items, totalItems };
  }

  private subjectFor(t: NotifyTarget): string {
    return t.status === "LATE"
      ? `Late arrival: ${t.studentName} on ${t.className}`
      : `Absence alert: ${t.studentName} on ${t.className}`;
  }

  private bodyFor(t: NotifyTarget, date: Date): string {
    const day = date.toISOString().slice(0, 10);
    const line =
      t.status === "LATE"
        ? `${t.studentName} (${t.admissionNumber}) was marked LATE for ${t.className} on ${day}.`
        : `${t.studentName} (${t.admissionNumber}) was marked ABSENT for ${t.className} on ${day}.`;
    return [
      `Dear ${t.recipientName},`,
      "",
      line,
      "Please contact the school if you have any questions.",
      "",
      "Regards,",
      "EduOS Attendance",
    ].join("\n");
  }

  private toHtml(text: string): string {
    const escaped = text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\n", "<br />");
    return `<div style="font-family:sans-serif;font-size:14px;color:#1a202c">${escaped}</div>`;
  }

  private normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
