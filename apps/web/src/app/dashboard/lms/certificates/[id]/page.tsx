"use client";

import { Award, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Certificate {
  id: string;
  certificateNumber: string;
  issuedAt: string;
  earnedScore: number | null;
  course: {
    id: string;
    title: string;
    summary: string | null;
    instructor: { id: string; firstName: string; lastName: string } | null;
  };
  student: {
    id: string;
    admissionNumber: string | null;
    firstName: string;
    lastName: string;
    guardianName: string | null;
  };
}

export default function CertificateDetailPage() {
  const params = useParams<{ id: string }>();
  const certificateId = params.id;
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Certificate>(
        `/certificates/${certificateId}`,
      );
      setCert(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load certificate",
      );
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Certificate not found"}
      </div>
    );
  }

  const issued = new Date(cert.issuedAt);
  const score = cert.earnedScore ?? 100;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/lms/certificates"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All certificates
        </Link>
        {isStudent && (
          <Link
            href={`/dashboard/lms/courses/${cert.course.id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            View course
          </Link>
        )}
      </div>

      <div className="rounded-2xl border-4 border-double border-primary/40 bg-gradient-to-br from-background to-primary/5 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Award className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Certificate of Completion
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          This certifies that
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {cert.student.firstName} {cert.student.lastName}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          has successfully completed the course
        </p>
        <p className="mt-1 text-xl font-semibold">{cert.course.title}</p>
        {cert.course.summary && (
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {cert.course.summary}
          </p>
        )}
        {cert.course.instructor && (
          <p className="mt-4 text-xs text-muted-foreground">
            Instructor: {cert.course.instructor.firstName}{" "}
            {cert.course.instructor.lastName}
          </p>
        )}

        <div className="mt-8 flex items-end justify-between border-t border-primary/20 pt-4 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Issued on
            </p>
            <p className="text-sm font-medium">{issued.toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xs text-muted-foreground">
              {cert.certificateNumber}
            </p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-xs font-medium text-emerald-600">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Score
            </p>
            <p className="text-sm font-medium">{score}%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => window.print()}>
          Print certificate
        </Button>
        {cert.student.admissionNumber && (
          <Badge variant="secondary">
            Adm. no. {cert.student.admissionNumber}
          </Badge>
        )}
      </div>
    </div>
  );
}
