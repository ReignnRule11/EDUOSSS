"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

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
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MfaChallenge } from "@/lib/auth-storage";

export default function LoginPage() {
  const { login, verifyMfaLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfa, setMfa] = useState<MfaChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({ email, password, tenantSlug });
      if ("requiresMfa" in result && result.requiresMfa) setMfa(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.errorCode === "ACCOUNT_LOCKED"
            ? "Too many failed attempts. Account is temporarily locked."
            : err.message
          : "Unable to sign in",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent) {
    event.preventDefault();
    if (!mfa) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyMfaLogin(mfa.mfaToken, mfaCode.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid security code");
      setSubmitting(false);
    }
  }

  function handleBackToSignIn() {
    setMfa(null);
    setMfaCode("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">EduOS</h1>
            <p className="text-sm text-muted-foreground">
              Enterprise School Management System
            </p>
          </div>
        </div>

        {mfa ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Two-factor authentication
              </CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app, or a backup
                code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Security code</Label>
                  <Input
                    id="mfaCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || mfaCode.trim().length === 0}
                >
                  {submitting ? <Spinner /> : "Verify and sign in"}
                </Button>
                <button
                  type="button"
                  onClick={handleBackToSignIn}
                  className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
                >
                  Use a different account
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Use your tenant slug and school account credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">Tenant slug</Label>
                  <Input
                    id="tenantSlug"
                    placeholder="bright-future-academy"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@school.example"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Spinner /> : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Need a school account?{" "}
          <Link href="/" className="underline underline-offset-4">
            Contact your administrator
          </Link>
        </p>
      </div>
    </div>
  );
}
