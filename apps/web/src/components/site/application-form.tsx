"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FORM_ENDPOINT = "/forms/application";

const ENTRY_LEVELS = [
  "Early Years (Ages 3–5)",
  "Primary Reception (Age 5)",
  "Primary Years 1–6",
  "Secondary Years 7–9",
  "IGCSE (Years 10–11)",
  "A-Levels (Years 12–13)",
] as const;

const RELATIONSHIPS = ["Mother", "Father", "Guardian"] as const;

export function ApplicationForm() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childFirstName: formData.get("childFirstName"),
          childLastName: formData.get("childLastName"),
          childDateOfBirth: formData.get("childDateOfBirth"),
          entryLevel: formData.get("entryLevel"),
          parentFirstName: formData.get("parentFirstName"),
          parentLastName: formData.get("parentLastName"),
          relationship: formData.get("relationship"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          currentSchool: formData.get("currentSchool"),
          notes: formData.get("notes"),
        }),
      });

      const json = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok || json?.success === false) {
        throw new Error(json?.message ?? "Unable to submit your application.");
      }

      setStatus("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your application.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h3 className="text-lg font-semibold">Application submitted</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Thank you for applying to Bright Future Academy. Our admissions team
          will contact you within two working days to arrange the next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Child's details</h2>
          <p className="text-sm text-muted-foreground">
            The learner applying for admission.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="childFirstName">First name</Label>
            <Input id="childFirstName" name="childFirstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="childLastName">Last name</Label>
            <Input id="childLastName" name="childLastName" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="childDateOfBirth">Date of birth</Label>
            <Input
              id="childDateOfBirth"
              name="childDateOfBirth"
              type="date"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entryLevel">Entry level</Label>
            <select
              id="entryLevel"
              name="entryLevel"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select an entry level</option>
              {ENTRY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Parent / guardian details</h2>
          <p className="text-sm text-muted-foreground">
            Primary contact for this application.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parentFirstName">First name</Label>
            <Input id="parentFirstName" name="parentFirstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentLastName">Last name</Label>
            <Input id="parentLastName" name="parentLastName" required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship to child</Label>
            <select
              id="relationship"
              name="relationship"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Additional information</h2>
          <p className="text-sm text-muted-foreground">Optional details.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentSchool">Current / previous school</Label>
          <Input
            id="currentSchool"
            name="currentSchool"
            placeholder="If transferring from another school"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes for the admissions team</Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Anything we should know about your child?"
          />
        </div>
      </section>

      {status === "error" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit application
          </>
        )}
      </Button>
    </form>
  );
}
