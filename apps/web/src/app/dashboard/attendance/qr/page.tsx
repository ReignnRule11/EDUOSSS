"use client";

import { QrCode, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ClassOption {
  id: string;
  name: string;
}

interface QrStudent {
  studentId: string;
  admissionNumber: string;
  name: string;
  token: string;
  status: string | null;
}

interface QrSheet {
  classGroupId: string;
  date: string;
  total: number;
  students: QrStudent[];
}

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "bg-emerald-500/15 text-emerald-700",
  ABSENT: "bg-red-500/15 text-red-700",
  LATE: "bg-amber-500/15 text-amber-700",
  EXCUSED: "bg-blue-500/15 text-blue-700",
};

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function QrAttendancePage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classGroupId, setClassGroupId] = useState("");
  const [date, setDate] = useState(today());
  const [sheet, setSheet] = useState<QrSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanToken, setScanToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<ClassOption[]>("/classes?limit=100")
      .then(({ data }) => setClasses(data))
      .catch(() => {});
  }, []);

  const loadSheet = useCallback(async () => {
    if (!classGroupId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<QrSheet>(
        `/attendance/qr/sheet?classGroupId=${encodeURIComponent(classGroupId)}&date=${date}`,
      );
      setSheet(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load QR sheet",
      );
    } finally {
      setLoading(false);
    }
  }, [classGroupId, date]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanToken.trim()) return;
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const { data } = await api.post<{
        status: string;
        scanned: { name: string; admissionNumber: string };
      }>("/attendance/scan", {
        token: scanToken.trim(),
        classGroupId: classGroupId || undefined,
        date,
      });
      setScanResult(
        `${data.scanned.name} (${data.scanned.admissionNumber}) marked ${data.status}.`,
      );
      setScanToken("");
      if (classGroupId) await loadSheet();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          QR Code Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a QR sheet per class and scan tokens to mark students present
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="qr-class">Class</Label>
            <select
              id="qr-class"
              value={classGroupId}
              onChange={(e) => setClassGroupId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qr-date">Date</Label>
            <input
              id="qr-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => void loadSheet()}
              disabled={!classGroupId || loading}
            >
              <QrCode className="h-4 w-4" />
              Generate sheet
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-4 w-4" /> Manual scan
            </CardTitle>
            <CardDescription>
              Paste a QR token or a student admission number to mark them
              present
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-3">
              <Input
                value={scanToken}
                onChange={(e) => setScanToken(e.target.value)}
                placeholder="EDUOS.ATT.1... or BFA/2026/0099"
                disabled={scanning}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={scanning || !scanToken.trim()}
              >
                {scanning ? "Scanning..." : "Mark present"}
              </Button>
            </form>
            {scanResult && (
              <p className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                {scanResult}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              QR sheet {sheet ? `· ${sheet.students.length} students` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner className="text-muted-foreground" />
              </div>
            ) : !sheet ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a class and generate a sheet to see student QR codes.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sheet.students.map((student) => (
                  <div
                    key={student.studentId}
                    className={cn(
                      "rounded-lg border p-3 text-center",
                      student.status === "PRESENT" &&
                        "border-emerald-300 bg-emerald-500/5",
                    )}
                  >
                    <div className="mx-auto w-fit rounded bg-white p-2">
                      <QRCodeSVG value={student.token} size={96} />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">
                      {student.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {student.admissionNumber}
                    </p>
                    <div className="mt-2">
                      {student.status ? (
                        <Badge
                          className={STATUS_STYLES[student.status]}
                          variant="secondary"
                        >
                          {student.status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not marked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
