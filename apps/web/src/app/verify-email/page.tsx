"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"verifying" | "verified" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        await api.post("/auth/verify-email", { token });
        if (!cancelled) setState("verified");
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setMessage(
            err instanceof ApiError ? err.message : "Verification failed",
          );
        }
      }
    }
    if (token) void verify();
    else {
      setState("error");
      setMessage("Missing verification token");
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Email verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state === "verifying" && (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Verifying your email address...
              </div>
            )}
            {state === "verified" && (
              <div className="space-y-4">
                <p className="rounded-md bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700">
                  Your email has been verified. You can now sign in.
                </p>
                <Link href="/login" passHref legacyBehavior>
                  <Button className="w-full">Continue to sign in</Button>
                </Link>
              </div>
            )}
            {state === "error" && (
              <div className="space-y-4">
                <p className="rounded-md bg-destructive/10 px-3 py-3 text-sm text-destructive">
                  {message}
                </p>
                <Link href="/login" passHref legacyBehavior>
                  <Button variant="outline" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
