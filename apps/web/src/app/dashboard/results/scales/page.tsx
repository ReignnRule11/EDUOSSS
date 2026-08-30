"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Entry {
  minScore: number;
  maxScore: number;
  letterGrade: string;
  gpa: number;
  remark?: string;
}

interface Scale {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  entries: Entry[];
}

const EMPTY_ENTRY: Entry = {
  minScore: 0,
  maxScore: 39.99,
  letterGrade: "F",
  gpa: 0,
  remark: "Fail",
};

export default function GradingScalesPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entries, setEntries] = useState<Entry[]>([{ ...EMPTY_ENTRY }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Scale[]>("/result-scales");
      setScales(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load scales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Scale name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/result-scales", {
        name: name.trim(),
        description: description || undefined,
        entries: entries.map((e) => ({
          ...e,
          minScore: Number(e.minScore),
          maxScore: Number(e.maxScore),
          gpa: Number(e.gpa),
        })),
      });
      setName("");
      setDescription("");
      setEntries([{ ...EMPTY_ENTRY }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create scale",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    setError(null);
    try {
      await api.delete(`/result-scales/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to deactivate scale",
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage grading scales.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grading Scales</h1>
          <p className="text-sm text-muted-foreground">
            Configure grade boundaries, GPA and remarks used to compute results
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-2 h-4 w-4" /> New scale
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a grading scale</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard A-F"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Grade boundaries</Label>
              {entries.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    step={0.01}
                    placeholder="Min"
                    value={entry.minScore}
                    onChange={(e) => {
                      const next = [...entries];
                      next[i] = { ...entry, minScore: Number(e.target.value) };
                      setEntries(next);
                    }}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="number"
                    step={0.01}
                    placeholder="Max"
                    value={entry.maxScore}
                    onChange={(e) => {
                      const next = [...entries];
                      next[i] = { ...entry, maxScore: Number(e.target.value) };
                      setEntries(next);
                    }}
                    className="w-24"
                  />
                  <Input
                    placeholder="Grade"
                    value={entry.letterGrade}
                    onChange={(e) => {
                      const next = [...entries];
                      next[i] = { ...entry, letterGrade: e.target.value };
                      setEntries(next);
                    }}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    step={0.01}
                    placeholder="GPA"
                    value={entry.gpa}
                    onChange={(e) => {
                      const next = [...entries];
                      next[i] = { ...entry, gpa: Number(e.target.value) };
                      setEntries(next);
                    }}
                    className="w-20"
                  />
                  <Input
                    placeholder="Remark"
                    value={entry.remark ?? ""}
                    onChange={(e) => {
                      const next = [...entries];
                      next[i] = { ...entry, remark: e.target.value };
                      setEntries(next);
                    }}
                    className="w-40"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove entry"
                    onClick={() =>
                      setEntries(entries.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setEntries([...entries, { ...EMPTY_ENTRY }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add boundary
              </Button>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create scale"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : scales.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No grading scales yet. Create one to compute letter grades.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scales.map((scale) => (
            <Card key={scale.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{scale.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        scale.isActive
                          ? "bg-emerald-500/15 text-emerald-600"
                          : ""
                      }
                    >
                      {scale.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Deactivate scale"
                      onClick={() => void handleDeactivate(scale.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {scale.description && (
                  <p className="text-sm text-muted-foreground">
                    {scale.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-3 py-1.5 text-left font-medium">
                          Range
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Grade
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          GPA
                        </th>
                        <th className="px-3 py-1.5 text-left font-medium">
                          Remark
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scale.entries.map((e, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-1.5">
                            {e.minScore} – {e.maxScore}
                          </td>
                          <td className="px-3 py-1.5 font-semibold">
                            {e.letterGrade}
                          </td>
                          <td className="px-3 py-1.5">{e.gpa}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {e.remark}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
