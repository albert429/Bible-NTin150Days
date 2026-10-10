import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/audio-host/_worker.js";

const file = Uint8Array.from({ length: 100 }, (_, i) => i);
const etag = '"abc"';
const files = {
  "/audio/days/001-a.m4a": ["audio/mp4", file],
  "/logo.png": ["image/png", file],
};
// Like Pages: ignores Range and answers If-None-Match. An unknown file gets
// a 404 page if the project has one, otherwise its HTML page.
const env = {
  ASSETS: {
    async fetch(request) {
      assert.equal(request.headers.get("Range"), null);
      const { pathname } = new URL(request.url);
      if (pathname === "/audio/days/x.m4a")
        return new Response("missing", { status: 404 });
      const [type, body] = files[pathname] || ["text/html", "<!doctype html>"];
      const headers = { ETag: etag, "Content-Type": type };
      if (request.headers.get("If-None-Match") === etag)
        return new Response(null, { status: 304, headers });
      return new Response(request.method === "HEAD" ? null : body, {
        headers: { ...headers, "Cache-Control": "public, max-age=0" },
      });
    },
  },
};
const get = (headers = {}, path = "/audio/days/001-a.m4a", method = "GET") =>
  worker.fetch(
    new Request(`https://audio.example.test${path}`, { method, headers }),
    env,
  );
const bytes = async (response) =>
  Array.from(new Uint8Array(await response.arrayBuffer()));

test("Audio host answers byte ranges with 206 for Safari and seeking", async () => {
  for (const [range, start, end] of [
    ["bytes=0-1", 0, 1],
    ["bytes=40-", 40, 99],
    ["bytes=-10", 90, 99],
    ["bytes=95-500", 95, 99],
    ["bytes=0-99", 0, 99],
  ]) {
    const response = await get({ Range: range });
    assert.equal(response.status, 206, range);
    assert.equal(
      response.headers.get("Content-Range"),
      `bytes ${start}-${end}/100`,
    );
    assert.equal(response.headers.get("Accept-Ranges"), "bytes");
    assert.equal(response.headers.get("Content-Type"), "audio/mp4");
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=31536000, immutable",
    );
    assert.deepEqual(await bytes(response), [...file.slice(start, end + 1)]);
  }
  const ifRange = await get({ Range: "bytes=1-2", "If-Range": etag });
  assert.equal(ifRange.status, 206);
});

test("Audio host rejects unsatisfiable ranges and ignores unusable ones", async () => {
  for (const range of ["bytes=100-", "bytes=-0"]) {
    const response = await get({ Range: range });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get("Content-Range"), "bytes */100");
  }
  for (const headers of [
    { Range: "bytes=0-1,5-6" },
    { Range: "bytes=5-2" },
    { Range: "items=0-1" },
    { Range: "bytes=0-1", "If-Range": '"changed"' },
    { Range: "bytes=0-1", "If-Range": "Sat, 10 Oct 2026 00:00:00 GMT" },
    {},
  ]) {
    const response = await get(headers);
    assert.equal(response.status, 200, JSON.stringify(headers));
    assert.equal(response.headers.get("Accept-Ranges"), "bytes");
    assert.equal((await bytes(response)).length, 100);
  }
  const head = await get({}, undefined, "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("Accept-Ranges"), "bytes");
});

test("Audio host passes through missing files, revalidation and other paths", async () => {
  assert.equal(
    (await get({ Range: "bytes=0-1" }, "/audio/days/x.m4a")).status,
    404,
  );
  const cached = await get({ Range: "bytes=0-1", "If-None-Match": etag });
  assert.equal(cached.status, 304);
  // A missing file's HTML page and other files must not become immutable.
  for (const path of ["/audio/days/002-not-uploaded.m4a", "/logo.png"]) {
    const response = await get({ Range: "bytes=0-1" }, path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=0");
    assert.equal(response.headers.get("Accept-Ranges"), null);
  }
});
