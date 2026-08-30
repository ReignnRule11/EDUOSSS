"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Discount {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  isActive: boolean;
}

interface Scholarship {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  isActive: boolean;
  student: { firstName: string; lastName: string; admissionNumber: string };
}

export default function DiscountsScholarshipsPage() {
  const { user } = useAuth();
  const canManage = user?.role !== "STUDENT" && user?.role !== "PARENT";

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showScholarship, setShowScholarship] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    name: "",
    type: "PERCENTAGE",
    value: "",
  });
  const [scholarshipForm, setScholarshipForm] = useState({
    studentId: "",
    name: "",
    type: "PERCENTAGE",
    value: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, s] = await Promise.all([
        api.get<Discount[]>("/finance/discounts"),
        api.get<Scholarship[]>("/finance/scholarships"),
      ]);
      setDiscounts(d.data);
      setScholarships(s.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  async function handleCreateDiscount() {
    if (!discountForm.name.trim() || !discountForm.value) {
      setError("Name and value are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/finance/discounts", {
        ...discountForm,
        value: Number(discountForm.value),
      });
      setDiscountForm({ name: "", type: "PERCENTAGE", value: "" });
      setShowDiscount(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create discount",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateScholarship() {
    if (!scholarshipForm.studentId.trim() || !scholarshipForm.name.trim()) {
      setError("Student id and name are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/finance/scholarships", {
        ...scholarshipForm,
        value: Number(scholarshipForm.value) || 0,
      });
      setScholarshipForm({
        studentId: "",
        name: "",
        type: "PERCENTAGE",
        value: "",
      });
      setShowScholarship(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create scholarship",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDiscount(id: string) {
    setError(null);
    try {
      await api.delete(`/finance/discounts/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove discount",
      );
    }
  }

  async function handleRemoveScholarship(id: string) {
    setError(null);
    try {
      await api.delete(`/finance/scholarships/${id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove scholarship",
      );
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        You do not have permission to manage discounts and scholarships.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Discounts & Scholarships
        </h1>
        <p className="text-sm text-muted-foreground">
          Apply fee reductions to invoices
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Discounts</CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowDiscount((s) => !s)}
              >
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showDiscount && (
              <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                <Input
                  placeholder="Name"
                  value={discountForm.name}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, name: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <select
                    value={discountForm.type}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, type: e.target.value })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FLAT">Flat</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="Value"
                    value={discountForm.value}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        value: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  className="sm:col-span-2"
                  onClick={() => void handleCreateDiscount()}
                  disabled={saving}
                >
                  Create discount
                </Button>
              </div>
            )}
            {loading ? (
              <Spinner />
            ) : discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discounts yet.</p>
            ) : (
              discounts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.type} · {d.value}
                      {d.type === "PERCENTAGE" ? "%" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        d.isActive ? "bg-emerald-500/15 text-emerald-600" : ""
                      }
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove discount"
                      onClick={() => void handleRemoveDiscount(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Scholarships</CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowScholarship((s) => !s)}
              >
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showScholarship && (
              <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                <Input
                  placeholder="Student id"
                  value={scholarshipForm.studentId}
                  onChange={(e) =>
                    setScholarshipForm({
                      ...scholarshipForm,
                      studentId: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Name (e.g. Merit scholarship)"
                  value={scholarshipForm.name}
                  onChange={(e) =>
                    setScholarshipForm({
                      ...scholarshipForm,
                      name: e.target.value,
                    })
                  }
                />
                <select
                  value={scholarshipForm.type}
                  onChange={(e) =>
                    setScholarshipForm({
                      ...scholarshipForm,
                      type: e.target.value,
                    })
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="PERCENTAGE">%</option>
                  <option value="FLAT">Flat</option>
                </select>
                <Input
                  type="number"
                  placeholder="Value"
                  value={scholarshipForm.value}
                  onChange={(e) =>
                    setScholarshipForm({
                      ...scholarshipForm,
                      value: e.target.value,
                    })
                  }
                />
                <Button
                  className="sm:col-span-2"
                  onClick={() => void handleCreateScholarship()}
                  disabled={saving}
                >
                  Create scholarship
                </Button>
              </div>
            )}
            {loading ? (
              <Spinner />
            ) : scholarships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scholarships yet.
              </p>
            ) : (
              scholarships.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {s.student.firstName} {s.student.lastName} · {s.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.student.admissionNumber} · {s.type} · {s.value}
                      {s.type === "PERCENTAGE" ? "%" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={
                        s.isActive ? "bg-emerald-500/15 text-emerald-600" : ""
                      }
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove scholarship"
                      onClick={() => void handleRemoveScholarship(s.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
