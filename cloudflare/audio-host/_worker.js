// Cloudflare Pages worker for a Pages project that hosts audio/days/.
// Pages answers a Range request for a static file with the whole file and
// 200. Safari and every iOS browser need 206 responses to play media, and
// other browsers cannot seek without them, so this serves byte ranges itself.
// Upload it as _worker.js at the root of the Pages project. See docs/audio.md.
export default {
  async fetch(request, env) {
    const plain = new Request(request);
    plain.headers.delete("Range");
    const response = await env.ASSETS.fetch(plain);
    // Without a 404.html, Pages answers a missing file with its HTML page.
    if (
      response.status !== 200 ||
      !new URL(request.url).pathname.startsWith("/audio/days/") ||
      response.headers.get("Content-Type")?.startsWith("text/html")
    )
      return response;

    const headers = new Headers(response.headers);
    headers.set("Accept-Ranges", "bytes");
    // Media filenames carry a content fingerprint.
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    const range = request.method === "GET" && request.headers.get("Range");
    if (!range || !unchanged(request, response))
      return new Response(response.body, { headers });

    const body = new Uint8Array(await response.arrayBuffer());
    const bytes = byteRange(range, body.length);
    if (!bytes) return new Response(body, { headers });
    headers.delete("Content-Length");
    if (bytes.start > bytes.end) {
      headers.set("Content-Range", `bytes */${body.length}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set(
      "Content-Range",
      `bytes ${bytes.start}-${bytes.end}/${body.length}`,
    );
    return new Response(body.subarray(bytes.start, bytes.end + 1), {
      status: 206,
      headers,
    });
  },
};

// If-Range asks for a range only while the file still has the given ETag.
function unchanged(request, response) {
  const validator = request.headers.get("If-Range");
  return (
    !validator ||
    (!validator.startsWith("W/") && validator === response.headers.get("ETag"))
  );
}

// Browsers ask for one range. Other or malformed ranges are ignored, which
// HTTP allows: the whole file is sent instead.
function byteRange(header, size) {
  const [, first, last] = /^bytes=(\d*)-(\d*)$/i.exec(header.trim()) || [];
  if (!first && !last) return;
  if (!first) return { start: Math.max(size - Number(last), 0), end: size - 1 };
  if (last && Number(last) < Number(first)) return;
  return {
    start: Number(first),
    end: Math.min(last ? Number(last) : size - 1, size - 1),
  };
}
