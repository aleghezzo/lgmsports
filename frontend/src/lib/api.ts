export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.append(k, String(v));
    }
  }
  return url.pathname + (url.search ? url.search : "");
}

function toFormUrlEncoded(body: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  return params.toString();
}

export interface ResponseEnvelope<T> {
  data: T;
  headers: Headers;
}

async function rawRequest<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<ResponseEnvelope<T>> {
  const url = buildUrl(path, options.query);
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  };

  if (options.body !== undefined && method !== "GET") {
    // Slim 3 reads form params with $request->getParam(); send as form-encoded
    // so we don't need to change the backend.
    init.body = toFormUrlEncoded(options.body as Record<string, unknown>);
    (init.headers as Record<string, string>)["Content-Type"] =
      "application/x-www-form-urlencoded;charset=UTF-8";
  }

  const res = await fetch(url, init);

  if (res.status === 401) {
    // Bubble a typed error so a global handler / hook can redirect.
    throw new ApiError(401, "Unauthorized");
  }

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => "");
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in (data as object)
        ? String((data as Record<string, unknown>).message)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return { data: data as T, headers: res.headers };
}

async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { data } = await rawRequest<T>(method, path, options);
  return data;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    request<T>("GET", path, { query }),
  // Returns both the parsed body and the response Headers (for endpoints
  // that ship pagination metadata in headers like X-Total-Count).
  getWithMeta: <T>(path: string, query?: RequestOptions["query"]) =>
    rawRequest<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>("PUT", path, { body }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>("DELETE", path, { body }),
};
