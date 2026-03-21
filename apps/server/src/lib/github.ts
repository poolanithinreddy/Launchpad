import { randomBytes } from "crypto";

import { env } from "../config/env";
import { ApiError } from "./api-error";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  avatar_url: string | null;
  email: string | null;
};

type GitHubEmailResponse = Array<{
  email: string;
  primary: boolean;
  verified: boolean;
}>;

type GitHubRepoResponse = Array<{
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
}>;

async function githubFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Launchpad"
    }
  });

  if (!response.ok) {
    throw new ApiError(response.status, "GITHUB_API_ERROR", "GitHub API request failed.");
  }

  return (await response.json()) as T;
}

export function generateOAuthState() {
  return randomBytes(24).toString("hex");
}

export function createGitHubOAuthUrl(state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_REDIRECT_URI);
  url.searchParams.set("scope", "read:user user:email repo");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");

  return url.toString();
}

export async function exchangeCodeForAccessToken(code: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Launchpad"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI
    })
  });

  if (!response.ok) {
    throw new ApiError(response.status, "GITHUB_OAUTH_FAILED", "GitHub token exchange failed.");
  }

  const data = (await response.json()) as GitHubTokenResponse;

  if (!data.access_token) {
    throw new ApiError(
      400,
      "GITHUB_OAUTH_FAILED",
      data.error_description ?? "GitHub did not return an access token."
    );
  }

  return data.access_token;
}

export async function fetchGitHubProfile(accessToken: string) {
  const user = await githubFetch<GitHubUserResponse>("/user", accessToken);

  let email = user.email;

  if (!email) {
    const emails = await githubFetch<GitHubEmailResponse>("/user/emails", accessToken);
    const preferredEmail =
      emails.find((item) => item.primary && item.verified) ?? emails.find((item) => item.verified);
    email = preferredEmail?.email ?? null;
  }

  return {
    githubId: String(user.id),
    username: user.login,
    email,
    avatarUrl: user.avatar_url
  };
}

export async function fetchGitHubRepos(accessToken: string) {
  const repos = await githubFetch<GitHubRepoResponse>(
    "/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
    accessToken
  );

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    private: repo.private,
    updatedAt: repo.updated_at
  }));
}
