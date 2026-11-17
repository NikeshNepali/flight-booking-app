import type { DuffelErrorItem } from './duffel.types.js';

const DUFFEL_BASE_URL = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

/** Raised when Duffel answers with a non-2xx status. */
export class DuffelApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: DuffelErrorItem[],
    public readonly requestId: string | null,
  ) {
    super(errors[0]?.message ?? `Duffel request failed with status ${status}`);
    this.name = 'DuffelApiError';
  }

  get code(): string | undefined {
    return this.errors[0]?.code;
  }

  get type(): string | undefined {
    return this.errors[0]?.type;
  }
}

/** Raised when the request never got a response (timeout, DNS, connection reset...). */
export class DuffelNetworkError extends Error {
  constructor(
    message: string,
    public readonly timedOut: boolean,
  ) {
    super(message);
    this.name = 'DuffelNetworkError';
  }
}

export interface DuffelClientOptions {
  accessToken: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/**
 * Minimal HTTP client for the Duffel REST API.
 * Docs: https://duffel.com/docs/api/overview/making-requests
 */
export class DuffelClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: DuffelClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(
    method: 'GET' | 'POST',
    path: string,
    {
      query,
      body,
      timeoutMs,
    }: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      timeoutMs?: number;
    } = {},
  ): Promise<{ data: T; meta?: unknown }> {
    const url = new URL(path, DUFFEL_BASE_URL);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'Content-Type': 'application/json',
          'Duffel-Version': DUFFEL_VERSION,
          Authorization: `Bearer ${this.options.accessToken}`,
        },
        body: body === undefined ? undefined : JSON.stringify({ data: body }),
        signal: AbortSignal.timeout(timeoutMs ?? this.options.timeoutMs),
      });
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new DuffelNetworkError(
        timedOut
          ? 'Duffel request timed out'
          : `Could not reach Duffel: ${(error as Error).message}`,
        timedOut,
      );
    }

    const requestId = response.headers.get('x-request-id');
    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const errors = (payload as { errors?: DuffelErrorItem[] } | null)?.errors ?? [];
      throw new DuffelApiError(response.status, errors, requestId);
    }

    return payload as { data: T; meta?: unknown };
  }
}
