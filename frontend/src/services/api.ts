import axios, { AxiosError } from 'axios';

/** Error thrown by all API calls, with the backend's error code and details. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level errors from the backend's Zod validation. */
  get fieldErrors(): { path: string; message: string }[] {
    const details = this.details as { fields?: { path: string; message: string }[] } | undefined;
    return details?.fields ?? [];
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  timeout: 100_000, // order creation can take a while at the airline
  headers: { 'Content-Type': 'application/json' },
});

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const body = error.response?.data as Envelope<unknown> | undefined;
    if (body?.error) {
      return new ApiError(
        body.error.message,
        body.error.code,
        error.response!.status,
        body.error.details,
      );
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('The request timed out. Please try again.', 'NETWORK_TIMEOUT', 0);
    }
    if (!error.response) {
      return new ApiError(
        'Cannot reach the server. Make sure the backend is running and try again.',
        'NETWORK_ERROR',
        0,
      );
    }
    return new ApiError(
      `Request failed (${error.response.status}).`,
      'HTTP_ERROR',
      error.response.status,
    );
  }
  return new ApiError('Unexpected error.', 'UNKNOWN', 0);
}

/** Performs a request and unwraps { success, data }, returning data and HTTP status. */
export async function apiRequest<T>(
  config: Parameters<typeof http.request>[0],
): Promise<{ data: T; status: number }> {
  try {
    const response = await http.request<Envelope<T>>(config);
    return { data: response.data.data, status: response.status };
  } catch (error) {
    throw toApiError(error);
  }
}
