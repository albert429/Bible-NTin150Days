import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { cairoDate, dayForDate, validDate } from "../server/dates.js";
const { app, db } = createApp(":memory:");
const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const url = "http://127.0.0.1:" + server.address().port;
after(() => {
  server.close();
  db.close();
});
async function api(path, { token, method = "GET", body } = {}) {
  const response = await fetch(url + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
test("Cairo date rollover, leap days and fixed calendar offsets", () => {
  assert.equal(cairoDate(new Date("2026-10-01T20:59:59Z")), "2026-10-01");
  assert.equal(cairoDate(new Date("2026-10-01T21:00:00Z")), "2026-10-02");
  assert.equal(dayForDate("2026-10-01", "2026-10-31"), 31);
  assert.equal(dayForDate("2026-10-30", "2026-11-01"), 3);
  assert.equal(dayForDate("2026-10-02", "2026-10-01"), 0);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("All 150 days and verse ranges are available", async () => {
  const { data } = await api("/plan");
  assert.equal(data.length, 150);
  let verses = 0;
  for (const d of data) {
    const reading = await api("/readings/" + d.day);
    assert.equal(reading.status, 200);
    for (const p of reading.data.passages) {
      assert.equal(p.verses.length, p.end - p.start + 1);
      assert.ok(
        p.verses.every((v) => v.text.length > 0 && !v.text.includes("\\")),
      );
      verses += p.verses.length;
    }
  }
  assert.equal(verses, 7966);
});
test("Credentials, duplicate names, group access, catch-up, undo and recovery", async () => {
  // Use a new minute-independent server because the full-plan test exceeds 150 requests.
  const a = createApp(":memory:");
  const s = a.app.listen(0);
  await new Promise((r) => s.once("listening", r));
  const base = "http://127.0.0.1:" + s.address().port;
  const call = async (path, token, method = "GET", body) => {
    const r = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    assert.equal((await call("/me")).status, 401);
    assert.equal(
      (
        await call("/join", null, "POST", {
          name: "A",
          startDate: "2026-02-31",
        })
      ).status,
      400,
    );
    const first = await call("/join", null, "POST", {
      name: "ألبرت",
      startDate: "2026-09-01",
    });
    assert.equal(first.status, 201);
    const t = first.data.token;
    const me = (await call("/me", t)).data;
    assert.equal(me.name, "ألبرت");
    assert.equal(me.completed.length, 0);
    const second = await call("/join", null, "POST", {
      name: "ألبرت",
      startDate: "2026-10-01",
      invite: me.invite,
    });
    const t2 = second.data.token;
    assert.notEqual((await call("/me", t2)).data.id, me.id);
    assert.equal(
      (
        await call("/join", null, "POST", {
          name: "Test",
          startDate: "2026-10-01",
          invite: "invalid",
        })
      ).status,
      404,
    );
    assert.equal(
      (await call("/completions/151", t, "PUT", { completed: true })).status,
      400,
    );
    await call("/completions/2", t, "PUT", { completed: true });
    await call("/completions/2", t, "PUT", { completed: true });
    await call("/completions/150", t, "PUT", { completed: true });
    const restored = (await call("/me", t)).data;
    assert.deepEqual(restored.completed, [2, 150]);
    assert.equal(restored.startDate, "2026-09-01");
    assert.deepEqual((await call("/me", t2)).data.completed, []);
    assert.equal((await call("/activity", t2)).data.entries.length, 2);
    const third = await call("/join", null, "POST", {
      name: "Other group",
      startDate: "2026-10-01",
    });
    assert.equal(
      (await call("/activity", third.data.token)).data.entries.length,
      0,
    );
    await call("/completions/2", t, "PUT", { completed: false });
    assert.deepEqual((await call("/me", t)).data.completed, [150]);
    assert.equal(db.prepare("SELECT count(*) as n FROM members").get().n, 0);
  } finally {
    s.close();
    a.db.close();
  }
});
