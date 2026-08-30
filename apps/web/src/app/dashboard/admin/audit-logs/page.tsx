"use client";

import { ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  role: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown | null;
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AuditPage {
  data: AuditLogRow[];
  meta: Meta;
}

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<AuditPage>(
        `/audit-logs?page=${pageNumber}&limit=${PAGE_SIZE}`,
      );
      setItems(result.data.data);
      setTotalPages(result.data.meta.totalPages);
      setPage(pageNumber);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  function formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          A trail of actions performed across the tenant
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : items && items.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Actor</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">Resource</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">
                          {log.actorEmail ?? "system"}
                        </span>
                        {log.role && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {log.role}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">{log.action}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1.5">
                          <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                          {log.resource}
                        </span>
                        {log.resourceId && (
                          <span className="block text-xs text-muted-foreground">
                            {log.resourceId}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No audit logs found
        </p>
      )}

      {items && items.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => void load(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
