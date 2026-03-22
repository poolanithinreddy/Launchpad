"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Github } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { apiBaseUrl } from "@/lib/api-client";

const oauthErrors: Record<string, string> = {
  GITHUB_OAUTH_FAILED: "GitHub sign-in failed. Please try again.",
  OAUTH_STATE_MISMATCH: "GitHub sign-in expired. Please try again.",
  INTERNAL_SERVER_ERROR: "Launchpad could not complete sign-in."
};

export function LoginView({ authError }: { authError?: string }) {
  const router = useRouter();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  if (isLoading && session) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border border-slate-200 bg-white shadow-none">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-900">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current">
              <path d="M12 3 21 21H3Z" />
            </svg>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight text-slate-900">Launchpad</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Deploy anything. Instantly.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {authError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {oauthErrors[authError] ?? "Sign-in failed. Please try again."}
            </div>
          ) : null}
          <Button asChild className="w-full">
            <Link href={`${apiBaseUrl}/auth/github`}>
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Link>
          </Button>
          <p className="text-center text-sm text-slate-500">GitHub is the only auth provider right now.</p>
        </CardContent>
      </Card>
    </main>
  );
}
