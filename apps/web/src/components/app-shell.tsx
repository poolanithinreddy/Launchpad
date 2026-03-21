"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/loading-screen";

const navigation = [
  { href: "/dashboard", label: "Projects" },
  { href: "/settings", label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session, isLoading, isError } = useSession();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.push("/login");
    }
  });

  useEffect(() => {
    if (!isLoading && isError) {
      router.replace("/login");
    }
  }, [isError, isLoading, router]);

  if (isLoading || !session) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                L
              </div>
              <div>
                <p className="font-semibold text-slate-900">Launchpad</p>
                <p className="text-xs text-slate-500">Deploy anything. Instantly.</p>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
                    pathname === item.href && "bg-slate-100 text-slate-900"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.avatarUrl ?? undefined} alt={session.username} />
              <AvatarFallback>{session.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-900">{session.username}</p>
              <p className="text-xs text-slate-500">{session.email ?? "GitHub account connected"}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">{children}</main>
    </div>
  );
}
