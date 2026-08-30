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

interface ClassGroup {
  id: string;
  name: string;
}

interface FeeItem {
  id: string;
  name: string;
  feeType: string;
  amount: number;
  isActive: boolean;
  classGroup: { name: string };
}

const EMPTY_FORM = {
  classGroupId: "",
  academicYear: "2026/2027",
  term: "FIRST",
  name: "",
  feeType: "TUITION",
  amount: "",
};

export default function FeeStructurePage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [items, setItems] = useState<FeeItem[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [term, setTerm] = useState("FIRST");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (canManage) {
        params.set("academicYear", academicYear);
        params.set("term", term);
      }
      const { data } = await api.get<FeeItem[]>(
        `/finance/fee-structures?${params.toString()}`,
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [canManage, academicYear, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await api.get<ClassGroup[]>("/classes?limit=100");
      setClasses(data);
    } catch {
      // optional
    }
  }, []);

  useEffect(() => {
    if (canManage) void loadClasses();
  }, [canManage, loadClasses]);

  async function handleCreate() {
    if (!form.name.trim() || !form.amount) {
      setError("Name and amount are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/finance/fee-structures", {
        ...form,
        amount: Number(form.amount),
        feeType: form.feeType || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create fee");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await api.delete(`/finance/fee-structures/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove fee");
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage the fee structure.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
          <p className="text-sm text-muted-foreground">
            Configure fee items per class, academic year and term
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-2 h-4 w-4" /> New fee item
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
            <CardTitle className="text-base">Add a fee item</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Class</Label>
              <select
                value={form.classGroupId}
                onChange={(e) =>
                  setForm({ ...form, classGroupId: e.target.value })
                }
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
              <Label>Academic year</Label>
              <Input
                value={form.academicYear}
                onChange={(e) =>
                  setForm({ ...form, academicYear: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Term</Label>
              <select
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
                <option value="THIRD">Third</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Fee type</Label>
              <select
                value={form.feeType}
                onChange={(e) => setForm({ ...form, feeType: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="TUITION">Tuition</option>
                <option value="SPORTS">Sports</option>
                <option value="LIBRARY">Library</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="TRANSPORT">Transport</option>
                <option value="DEVELOPMENT">Development</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Tuition"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? "Creating..." : "Create fee item"}
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Academic year</label>
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Term</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="FIRST">First</option>
            <option value="SECOND">Second</option>
            <option value="THIRD">Third</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fee items for this class/term yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge
                    variant="secondary"
                    className={
                      item.isActive
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-slate-500/15 text-slate-600"
                    }
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.classGroup.name} · {item.feeType}
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  {item.amount.toLocaleString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove fee item"
                  onClick={() => void handleRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
