const endpoint =
  "https://nitnaxbnovvkikjseevq.supabase.co/functions/v1/ip-workbench-api";
const publishableKey = "sb_publishable_FLJV-HijuA6g_tFJ6kCEqg_dMQ5rJGD";
export function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", publishableKey);
  const url = new URL(path, "https://workbench.local");
  const resource = url.pathname.split("/").pop() || "";
  url.searchParams.set("resource", resource);
  return fetch(endpoint + "?" + url.searchParams.toString(), {
    ...options,
    headers,
  });
}
