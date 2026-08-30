"use client";

import { Building2, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  establishedYear: number | null;
  motto: string | null;
  academicYear: string | null;
  isActive: boolean;
  _count?: { students?: number; teachers?: number; classes?: number };
}

interface SchoolForm {
  name: string;
  code: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  establishedYear: string;
  motto: string;
  academicYear: string;
}

const EMPTY_FORM: SchoolForm = {
  name: "",
  code: "",
  type: "K_12",
  address: "",
  phone: "",
  email: "",
  website: "",
  establishedYear: "",
  motto: "",
  academicYear: "",
};

const SCHOOL_TYPES = [
  "PRIMARY",
  "SECONDARY",
  "K_12",
  "INTERNATIONAL",
  "VOCATIONAL",
  "UNIVERSITY",
];

export default function SchoolProfilePage() {
  const [items, setItems] = useState<SchoolRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SchoolForm>(EMPTY_FORM);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SchoolRow[]>("/schools?limit=100");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load schools",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleEdit(school: SchoolRow) {
    setEditingId(school.id);
    setShowForm(true);
    setSaveMessage(null);
    setForm({
      name: school.name,
      code: school.code,
      type: school.type,
      address: school.address ?? "",
      phone: school.phone ?? "",
      email: school.email ?? "",
      website: school.website ?? "",
      establishedYear: school.establishedYear
        ? String(school.establishedYear)
        : "",
      motto: school.motto ?? "",
      academicYear: school.academicYear ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const payload = {
        ...form,
        establishedYear: form.establishedYear
          ? Number(form.establishedYear)
          : undefined,
      };
      if (editingId) {
        await api.patch(`/schools/${editingId}`, payload);
      } else {
        await api.post("/schools", payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setSaveMessage(
        editingId
          ? "School updated successfully."
          : "School created successfully.",
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save school");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your school details, contact information and profile
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm((v) => !v);
            setSaveMessage(null);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm && !editingId ? "Cancel" : "Add school"}
        </Button>
      </div>

      {saveMessage && !showForm && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
          {saveMessage}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {editingId ? "Edit school" : "New school"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="school-name">School name</Label>
                  <Input
                    id="school-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-code">Code</Label>
                  <Input
                    id="school-code"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-type">Type</Label>
                  <select
                    id="school-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {SCHOOL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-year">Academic year</Label>
                  <Input
                    id="school-year"
                    placeholder="2026/2027"
                    value={form.academicYear}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="school-address">Address</Label>
                  <Input
                    id="school-address"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-phone">Phone</Label>
                  <Input
                    id="school-phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-email">Email</Label>
                  <Input
                    id="school-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-website">Website</Label>
                  <Input
                    id="school-website"
                    value={form.website}
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="school-established">Established year</Label>
                  <Input
                    id="school-established"
                    type="number"
                    value={form.establishedYear}
                    onChange={(e) =>
                      setForm({ ...form, establishedYear: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="school-motto">Motto</Label>
                  <Input
                    id="school-motto"
                    value={form.motto}
                    onChange={(e) =>
                      setForm({ ...form, motto: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create school"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((school) => (
            <Card key={school.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{school.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {school.code} · {school.type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit school"
                  onClick={() => handleEdit(school)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={school.isActive ? "default" : "secondary"}>
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {school.academicYear && (
                    <Badge variant="secondary">{school.academicYear}</Badge>
                  )}
                  {school.establishedYear && (
                    <Badge variant="outline">
                      Est. {school.establishedYear}
                    </Badge>
                  )}
                </div>
                {school.motto && (
                  <p className={cn("italic text-muted-foreground")}>
                    &ldquo;{school.motto}&rdquo;
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                  <div>
                    <p className="text-xl font-bold">
                      {school._count?.students ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {school._count?.teachers ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Teachers</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {school._count?.classes ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Classes</p>
                  </div>
                </div>
                {(school.address || school.phone || school.email) && (
                  <div className="space-y-1 text-muted-foreground">
                    {school.address && <p>{school.address}</p>}
                    {school.phone && <p>{school.phone}</p>}
                    {school.email && <p>{school.email}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-muted-foreground">
          No schools found
        </p>
      )}
    </div>
  );
}
