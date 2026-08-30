"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";

interface TransferRow {
  id: string;
  status: string;
  transferDate: string;
  reason: string | null;
  fromSchool?: { id: string; name: string } | null;
  toSchool?: { id: string; name: string } | null;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  } | null;
}

interface ListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

const LIMIT = 10;

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TransferRow[] | null>(null);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      const { data, meta: pagination } = await api.get<TransferRow[]>(
        `/student-transfers?${params.toString()}`,
      );
      setItems(data);
      setMeta((pagination as unknown as ListMeta) ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load transfers",
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(id: string, verb: "approve" | "complete" | "reject") {
    setWorking(id);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/student-transfers/${id}/${verb}`);
      setMessage(`Transfer ${verb}d.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : `Failed to ${verb} transfer`,
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
        <p className="text-sm text-muted-foreground">
          Inter-school transfer requests and their status
        </p>
      </div>

      {message && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Transfer date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Spinner className="mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items && items.length > 0 ? (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    {t.student ? (
                      <Link
                        href={`/dashboard/students/${t.student.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {t.student.firstName} {t.student.lastName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.fromSchool?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.toSchool?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(t.transferDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "COMPLETED"
                          ? "default"
                          : t.status === "APPROVED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {t.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working === t.id}
                            onClick={() => action(t.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={working === t.id}
                            onClick={() => action(t.id, "reject")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {t.status === "APPROVED" && (
                        <Button
                          size="sm"
                          disabled={working === t.id}
                          onClick={() => action(t.id, "complete")}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No transfers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
