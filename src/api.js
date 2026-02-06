function getApiBase() {
  const raw = import.meta?.env?.VITE_API_BASE || "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = base ? `${base}${normalizedPath}` : normalizedPath;
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth-expired"));
    }
    const message =
      payload?.error?.message ||
      payload?.detail ||
      payload?.toString() ||
      "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}
