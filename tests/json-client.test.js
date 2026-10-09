import { test } from "node:test";
import assert from "node:assert/strict";
import { createJsonClient } from "../src/jsonClient.ts";

const options = {
  url: (key) => `/data/${key}.json`,
  validate: (data, key) => data?.key === key,
  message: (key) => `تعذر تحميل ${key}`,
};

test("Concurrent loads share one request and successes are cached", async () => {
  const urls = [];
  const client = createJsonClient(options, async (url) => {
    urls.push(url);
    return Response.json({ key: "a" });
  });
  const first = client.load("a");
  assert.equal(client.load("a"), first);
  assert.deepEqual(await first, { key: "a" });
  assert.deepEqual(await client.load("a"), { key: "a" });
  assert.deepEqual(client.peek("a"), { key: "a" });
  assert.deepEqual(urls, ["/data/a.json"]);
});

test("HTTP and validation failures reject with the message and are not cached", async () => {
  let requests = 0;
  const client = createJsonClient(options, async () => {
    requests++;
    if (requests === 1) return new Response("down", { status: 503 });
    if (requests === 2) return Response.json({ key: "other" });
    return Response.json({ key: "b" });
  });
  await assert.rejects(client.load("b"), /تعذر تحميل b/);
  await assert.rejects(client.load("b"), /تعذر تحميل b/);
  assert.equal(client.peek("b"), undefined);
  assert.deepEqual(await client.load("b"), { key: "b" });
  assert.equal(requests, 3);
});

test("A request that outlives the timeout is aborted and can be retried", async () => {
  let aborted = false;
  const client = createJsonClient(
    options,
    (_url, init) =>
      new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => {
          aborted = true;
          reject(new DOMException("Aborted", "AbortError"));
        }),
      ),
    10,
  );
  await assert.rejects(client.load("c"), /تعذر تحميل c/);
  assert.ok(aborted);
  assert.equal(client.peek("c"), undefined);
});
