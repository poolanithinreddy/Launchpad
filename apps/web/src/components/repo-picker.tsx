import { Github, Search } from "lucide-react";
import type { GithubRepoDto } from "@launchpad/types";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type RepoPickerProps = {
  search: string;
  onSearchChange: (value: string) => void;
  repos: GithubRepoDto[];
  selectedRepoName: string;
  onSelectRepo: (repo: GithubRepoDto) => void;
  isLoading: boolean;
  error: string | null;
};

export function RepoPicker({
  search,
  onSearchChange,
  repos,
  selectedRepoName,
  onSelectRepo,
  isLoading,
  error
}: RepoPickerProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search repositories"
          className="pl-9"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="max-h-[32rem] space-y-2 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
            />
          ))
        ) : repos.length ? (
          repos.map((repo) => {
            const selected = repo.fullName === selectedRepoName;

            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => onSelectRepo(repo)}
                className={cn(
                  "flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition",
                  selected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <p className="truncate font-medium">{repo.fullName}</p>
                  </div>
                  <p className={cn("text-sm", selected ? "text-slate-200" : "text-slate-500")}>
                    Default branch: {repo.defaultBranch}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full px-2 py-1 text-xs",
                    selected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  {repo.private ? "Private" : "Public"}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No repositories match this search.
          </div>
        )}
      </div>
    </div>
  );
}
