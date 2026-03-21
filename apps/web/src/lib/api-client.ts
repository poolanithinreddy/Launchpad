import axios from "axios";
import type { AxiosError } from "axios";
import type { ApiErrorResponse, ApiSuccessResponse } from "@launchpad/types";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export async function unwrapData<T>(promise: Promise<{ data: ApiSuccessResponse<T> }>) {
  const response = await promise;
  return response.data.data;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.data?.error ?? fallback;
}
