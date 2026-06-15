import { resolveBaseUrl } from "./utils.mjs";

export async function fetchTextResource(platform, resourcePath, baseURL) {
  const base = resolveBaseUrl(platform, baseURL);
  try {
    const res = await fetch(`${base}${resourcePath}`);
    const text = res.ok ? await res.text() : null;
    return { ok: res.ok, status: res.status, text: text?.slice(0, 500) ?? null };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export async function fetchLlms(platform, baseURL) {
  const res = await fetchTextResource(platform, "/llms.txt", baseURL);
  const pageCount = res.text ? (res.text.match(/^- \[/gm) || []).length : 0;
  return { ok: res.ok, status: res.status, pageCount, sample: res.text };
}

export async function testMcp(platform, baseURL) {
  for (const p of ["/mcp", "/.well-known/mcp", "/api/mcp"]) {
    const res = await fetchTextResource(platform, p, baseURL);
    if (res.ok) return { found: true, path: p, status: res.status };
  }
  return { found: false };
}
