"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Github, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSession } from "@/hooks/use-session";
import { logout } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.push("/login");
    }
  });

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">View your connected GitHub account and end your session.</p>
      </section>

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-slate-900">Account</CardTitle>
          <CardDescription className="text-slate-600">
            Launchpad uses your GitHub account for authentication and repository import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session.avatarUrl ?? undefined} alt={session.username} />
              <AvatarFallback>{session.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{session.username}</p>
              <p className="truncate text-sm text-slate-500">{session.email ?? "No public email"}</p>
            </div>
          </div>

          {logoutMutation.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getApiErrorMessage(logoutMutation.error, "Logout failed.")}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <a href={`https://github.com/${session.username}`} target="_blank" rel="noreferrer">
                <Github className="mr-2 h-4 w-4" />
                View GitHub profile
              </a>
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
