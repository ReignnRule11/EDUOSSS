"use client";

import { Award, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface VerifyResult {
  valid: boolean;
  certificate: Certificate;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT" || user?.role === "PARENT";

  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [number, setNumber] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Certificate[]>("/certificates?limit=100");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load certificates",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleVerify() {
    if (!number.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const { data } = await api.get<VerifyResult>(
        `/certificates/verify?number=${encodeURIComponent(number.trim())}`,
      );
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(
        err instanceof ApiError ? err.message : "Certificate not found",
      );
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          {isStudent
            ? "Certificates you have earned for completing courses"
            : "Certificates issued across your courses"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Verify a certificate
          </CardTitle>
          <CardDescription>
            Enter a certificate number to check its validity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. CERT-2026-XXXXXXXX"
              className="max-w-sm"
            />
            <Button onClick={() => void handleVerify()} disabled={verifying}>
              {verifying ? "Checking..." : "Verify"}
            </Button>
          </div>
          {verifyError && (
            <p className="text-sm text-destructive">{verifyError}</p>
          )}
          {verifyResult && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <Badge className="bg-emerald-500/15 text-emerald-600">
                Valid certificate
              </Badge>
              <div className="text-sm">
                <p className="font-medium">
                  {verifyResult.certificate.student.firstName}{" "}
                  {verifyResult.certificate.student.lastName} ·{" "}
                  {verifyResult.certificate.course.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {verifyResult.certificate.certificateNumber} ·{" "}
                  {new Date(
                    verifyResult.certificate.issuedAt,
                  ).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/dashboard/lms/certificates/${verifyResult.certificate.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                View certificate
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {isStudent
                ? "No certificates yet. Complete a course to earn one."
                : "No certificates issued yet. They are issued automatically when students complete courses."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/lms/certificates/${c.id}`}
              className="group flex flex-col rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <Badge variant="secondary">
                  {new Date(c.issuedAt).toLocaleDateString()}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="font-medium group-hover:underline">
                  {c.course.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.student.firstName} {c.student.lastName}
                  {c.course.instructor
                    ? ` · ${c.course.instructor.firstName} ${c.course.instructor.lastName}`
                    : ""}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {c.certificateNumber}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
