import express from "express";
import Database from "better-sqlite3";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cairoDate, validDate } from "./dates.js";
const plan = JSON.parse(
  readFileSync(new URL("../data/plan.json", import.meta.url), "utf8"),
);
const secret = () => randomBytes(32).toString("base64url");
const hash = (s) => createHash("sha256").update(s).digest("hex");
export function createApp(dbPath = "data/progress.sqlite") {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS groups(id TEXT PRIMARY KEY, invite TEXT UNIQUE NOT NULL);
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), name TEXT NOT NULL, start_date TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL);
 CREATE TABLE IF NOT EXISTS completions(member_id TEXT NOT NULL REFERENCES members(id), day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 150), completed_at TEXT NOT NULL, PRIMARY KEY(member_id,day));`);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8kb" }));
  app.use((req, res, next) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  const attempts = new Map();
  app.use("/api", (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let item = attempts.get(key);
    if (!item || now - item.time > 60000) {
      item = { time: now, count: 0 };
      attempts.set(key, item);
    }
    if (++item.count > 180)
      return res
        .status(429)
        .json({ error: "طلبات كثيرة. انتظر دقيقة وحاول مجددًا." });
    if (attempts.size > 10000)
      for (const [k, v] of attempts)
        if (now - v.time > 60000) attempts.delete(k);
    next();
  });
  app.get("/api/plan", (_, res) =>
    res.json(
      plan.map(({ passages, ...d }) => ({
        ...d,
        passages: passages.map(({ verses, ...p }) => p),
      })),
    ),
  );
  app.get("/api/readings/:day", (req, res) => {
    const d = plan[Number(req.params.day) - 1];
    if (!d) return res.status(404).json({ error: "اليوم غير موجود" });
    res.json(d);
  });
  app.get("/api/invite/:invite", (req, res) =>
    res.json({
      valid: !!db
        .prepare("SELECT id FROM groups WHERE invite=?")
        .get(req.params.invite),
    }),
  );
  app.post("/api/join", (req, res) => {
    const { name, startDate, invite } = req.body || {};
    if (
      invite !== undefined &&
      (typeof invite !== "string" || invite.length > 100)
    )
      return res.status(400).json({ error: "رابط الدعوة غير صالح." });
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 60 ||
      !validDate(startDate)
    )
      return res.status(400).json({ error: "أدخل اسمًا وتاريخ بداية صحيحين." });
    let group = invite
      ? db.prepare("SELECT * FROM groups WHERE invite=?").get(invite)
      : null;
    if (invite && !group)
      return res.status(404).json({ error: "رابط الدعوة غير صالح." });
    const token = secret(),
      id = randomBytes(8).toString("hex");
    db.transaction(() => {
      if (!group) {
        group = { id: secret(), invite: secret() };
        db.prepare("INSERT INTO groups VALUES (?,?)").run(
          group.id,
          group.invite,
        );
      }
      db.prepare("INSERT INTO members VALUES (?,?,?,?,?)").run(
        id,
        group.id,
        name.trim(),
        startDate,
        hash(token),
      );
    })();
    res.status(201).json({ token });
  });
  app.use("/api", (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    if (!token || token.length > 100)
      return res
        .status(401)
        .json({ error: "استعد رحلتك برابطك الخاص أو ابدأ رحلة جديدة." });
    const member = db
      .prepare("SELECT * FROM members WHERE token_hash=?")
      .get(hash(token));
    if (!member)
      return res.status(401).json({ error: "رابط الاستعادة غير صالح." });
    req.member = member;
    next();
  });
  app.get("/api/me", (req, res) => {
    const m = req.member;
    res.json({
      id: m.id,
      name: m.name,
      startDate: m.start_date,
      invite: db.prepare("SELECT invite FROM groups WHERE id=?").get(m.group_id)
        .invite,
      completed: db
        .prepare("SELECT day FROM completions WHERE member_id=? ORDER BY day")
        .all(m.id)
        .map((x) => x.day),
      today: cairoDate(),
    });
  });
  app.get("/api/activity", (req, res) => {
    const today = cairoDate();
    const rows = db
      .prepare(
        "SELECT m.id,m.name,c.day,c.completed_at FROM completions c JOIN members m ON m.id=c.member_id WHERE m.group_id=? ORDER BY c.completed_at DESC",
      )
      .all(req.member.group_id)
      .filter((x) => cairoDate(new Date(x.completed_at)) === today);
    res.json({
      members: db
        .prepare("SELECT count(*) AS n FROM members WHERE group_id=?")
        .get(req.member.group_id).n,
      entries: rows,
    });
  });
  app.put("/api/completions/:day", (req, res) => {
    const day = Number(req.params.day);
    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 150 ||
      typeof req.body?.completed !== "boolean"
    )
      return res.status(400).json({ error: "قيمة غير صالحة" });
    if (req.body.completed)
      db.prepare("INSERT OR IGNORE INTO completions VALUES (?,?,?)").run(
        req.member.id,
        day,
        new Date().toISOString(),
      );
    else
      db.prepare("DELETE FROM completions WHERE member_id=? AND day=?").run(
        req.member.id,
        day,
      );
    res.json({ ok: true });
  });
  app.use(express.static(fileURLToPath(new URL("../dist", import.meta.url))));
  app.get("/{*path}", (_, res) =>
    res.sendFile(fileURLToPath(new URL("../dist/index.html", import.meta.url))),
  );
  app.use((err, req, res, next) => {
    console.error(err.message);
    res
      .status(err.status || 500)
      .json({ error: "تعذر حفظ التغيير. حاول مرة أخرى." });
  });
  return { app, db };
}
