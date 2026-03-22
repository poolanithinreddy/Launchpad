"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  Bell,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Search,
  Settings,
  X
} from "lucide-react";

import { useSession } from "@/hooks/use-session";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/loading-screen";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const AppShellSearchContext = createContext<SearchContextValue | null>(null);

const navigation = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderOpen
  },
  {
    href: "/deployments",
    label: "Deployments",
    icon: Rocket
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart2
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings
  }
] as const;

function LaunchpadMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-current text-slate-950"
    >
      <path d="M12 3 21 21H3Z" />
    </svg>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/project/") && pathname.endsWith("/settings")) {
    return "Project Settings";
  }

  if (pathname.startsWith("/project/")) {
    return "Project Details";
  }

  switch (pathname) {
    case "/dashboard":
      return "Dashboard";
    case "/projects":
      return "Projects";
    case "/deployments":
      return "Deployments";
    case "/analytics":
      return "Analytics";
    case "/settings":
      return "Settings";
    case "/new-project":
      return "New Project";
    default:
      return "Launchpad";
  }
}

export function useAppShellSearch() {
  const context = useContext(AppShellSearchContext);

  if (!context) {
    return {
      query: "",
      setQuery: () => undefined
    };
  }

  return context;
}

function SidebarContent({
  pathname,
  username,
  email,
  avatarUrl,
  onLogout,
  isLoggingOut
}: {
  pathname: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-8">
        <Link href="/dashboard" className="flex items-center gap-3 px-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <LaunchpadMark />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">Launchpad</p>
            <p className="text-xs text-slate-500">Deploy anything. Instantly.</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-950",
                  isActive && "bg-slate-950 text-white hover:bg-slate-900 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={avatarUrl ?? undefined} alt={username} />
            <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{username}</p>
            <p className="truncate text-xs text-slate-500">{email ?? "GitHub connected"}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  if (isLoading || !session) {
    return <LoadingScreen />;
  }

  return (
    <AppShellSearchContext.Provider
      value={{
        query: searchQuery,
        setQuery: setSearchQuery
      }}
    >
      <div className="min-h-screen bg-transparent">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition md:hidden",
            isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsSidebarOpen(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[220px] border-r border-slate-200 bg-slate-50 p-5 transition-transform duration-150 ease-out md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent
            pathname={pathname}
            username={session.username}
            email={session.email}
            avatarUrl={session.avatarUrl}
            onLogout={() => logoutMutation.mutate()}
            isLoggingOut={logoutMutation.isPending}
          />
        </aside>

        <aside className="fixed inset-y-0 left-0 hidden w-[220px] border-r border-slate-200 bg-slate-50 p-5 md:block">
          <SidebarContent
            pathname={pathname}
            username={session.username}
            email={session.email}
            avatarUrl={session.avatarUrl}
            onLogout={() => logoutMutation.mutate()}
            isLoggingOut={logoutMutation.isPending}
          />
        </aside>

        <div className="md:pl-[220px]">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
            <div className="flex min-h-20 items-center gap-4 px-4 py-4 md:px-8">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-950">{pageTitle}</h1>
                <p className="text-sm text-slate-500">Ship builds, watch logs, and keep every preview close.</p>
              </div>

              <div className="hidden flex-1 justify-center md:flex">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search projects, repos, or deployments"
                    className="border-slate-200 bg-slate-50 pl-10"
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 md:inline-flex"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={session.avatarUrl ?? undefined} alt={session.username} />
                  <AvatarFallback>{session.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </AppShellSearchContext.Provider>
  );
}
