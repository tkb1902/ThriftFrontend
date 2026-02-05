export async function apiFetch(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}
