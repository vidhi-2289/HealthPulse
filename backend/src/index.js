const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function parseDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

async function runCheckForTarget(target) {
  const started = Date.now();
  let status = "DOWN";
  let statusCode = null;
  let responseTimeMs = null;
  let errorMessage = null;

  try {
    const response = await axios.request({
      url: target.url,
      method: target.method,
      timeout: target.timeoutMs,
      validateStatus: () => true,
    });
    responseTimeMs = Date.now() - started;
    statusCode = response.status;
    status = response.status === target.expectedStatus ? "UP" : "DOWN";
    if (status === "DOWN") {
      errorMessage = `Expected ${target.expectedStatus}, got ${response.status}`;
    }
  } catch (error) {
    responseTimeMs = Date.now() - started;
    errorMessage = error.message;
  }

  const savedCheck = await prisma.healthCheck.create({
    data: {
      targetId: target.id,
      status,
      statusCode,
      responseTimeMs,
      errorMessage,
    },
  });

  if (status === "DOWN") {
    await prisma.alert.create({
      data: {
        targetId: target.id,
        type: "DOWN",
        message: `${target.name} is DOWN (${errorMessage || "check failed"})`,
        sentVia: "IN_APP",
      },
    });
  }

  return savedCheck;
}

async function runChecksCycle() {
  const activeTargets = await prisma.target.findMany({ where: { isActive: true } });
  for (const target of activeTargets) {
    // Sequential checks keep logs deterministic for demos and simplify debugging.
    await runCheckForTarget(target);
  }
}

cron.schedule("*/1 * * * *", async () => {
  try {
    await runChecksCycle();
  } catch (error) {
    console.error("Scheduled health-check cycle failed:", error.message);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "healthpulse-backend" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already used" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
    return res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });
    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: signToken(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  res.json({ user });
});

app.get("/api/targets", authMiddleware, async (req, res) => {
  const targets = await prisma.target.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ targets });
});

app.post("/api/targets", authMiddleware, async (req, res) => {
  const { name, url, method = "GET", intervalSec = 30, timeoutMs = 5000, expectedStatus = 200 } = req.body;
  if (!name || !url) return res.status(400).json({ message: "name and url required" });
  const target = await prisma.target.create({
    data: {
      userId: req.user.userId,
      name,
      url,
      method,
      intervalSec,
      timeoutMs,
      expectedStatus,
    },
  });
  res.status(201).json({ target });
});

app.put("/api/targets/:id", authMiddleware, async (req, res) => {
  const target = await prisma.target.findFirst({
    where: { id: Number(req.params.id), userId: req.user.userId },
  });
  if (!target) return res.status(404).json({ message: "Target not found" });

  const { name, url, method, intervalSec, timeoutMs, expectedStatus, isActive } = req.body;
  if (!name || !url) return res.status(400).json({ message: "name and url required" });

  const updated = await prisma.target.update({
    where: { id: target.id },
    data: {
      name,
      url,
      method: method || "GET",
      intervalSec: Number(intervalSec) || 30,
      timeoutMs: Number(timeoutMs) || 5000,
      expectedStatus: Number(expectedStatus) || 200,
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  });
  res.json({ target: updated });
});

app.patch("/api/targets/:id/toggle", authMiddleware, async (req, res) => {
  const target = await prisma.target.findFirst({
    where: { id: Number(req.params.id), userId: req.user.userId },
  });
  if (!target) return res.status(404).json({ message: "Target not found" });
  const updated = await prisma.target.update({
    where: { id: target.id },
    data: { isActive: !target.isActive },
  });
  res.json({ target: updated });
});

app.delete("/api/targets/:id", authMiddleware, async (req, res) => {
  const target = await prisma.target.findFirst({
    where: { id: Number(req.params.id), userId: req.user.userId },
  });
  if (!target) return res.status(404).json({ message: "Target not found" });
  await prisma.target.delete({ where: { id: target.id } });
  res.status(204).send();
});

app.post("/api/checks/run-now/:targetId", authMiddleware, async (req, res) => {
  const target = await prisma.target.findFirst({
    where: { id: Number(req.params.targetId), userId: req.user.userId },
  });
  if (!target) return res.status(404).json({ message: "Target not found" });
  const check = await runCheckForTarget(target);
  res.json({ check });
});

app.get("/api/checks", authMiddleware, async (req, res) => {
  const targetId = req.query.targetId ? Number(req.query.targetId) : undefined;
  const status = req.query.status || undefined;
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100;

  const checks = await prisma.healthCheck.findMany({
    where: {
      ...(targetId ? { targetId } : {}),
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            checkedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      target: { userId: req.user.userId },
    },
    orderBy: { checkedAt: "desc" },
    take: limit,
    include: { target: { select: { id: true, name: true, url: true } } },
  });
  res.json({ checks });
});

app.get("/api/alerts", authMiddleware, async (req, res) => {
  const targetId = req.query.targetId ? Number(req.query.targetId) : undefined;
  const type = req.query.type || undefined;
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100;

  const alerts = await prisma.alert.findMany({
    where: {
      ...(targetId ? { targetId } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            triggeredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      target: { userId: req.user.userId },
    },
    orderBy: { triggeredAt: "desc" },
    take: limit,
    include: { target: { select: { name: true, url: true } } },
  });
  res.json({ alerts });
});

app.get("/api/reports/checks", authMiddleware, async (req, res) => {
  const targetId = req.query.targetId ? Number(req.query.targetId) : undefined;
  const status = req.query.status || undefined;
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const format = req.query.format === "csv" ? "csv" : "json";
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 500;

  const checks = await prisma.healthCheck.findMany({
    where: {
      ...(targetId ? { targetId } : {}),
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            checkedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      target: { userId: req.user.userId },
    },
    orderBy: { checkedAt: "desc" },
    take: limit,
    include: { target: { select: { id: true, name: true, url: true } } },
  });

  if (format === "json") return res.json({ count: checks.length, checks });

  const header = [
    "id",
    "checkedAt",
    "targetId",
    "targetName",
    "targetUrl",
    "status",
    "statusCode",
    "responseTimeMs",
    "errorMessage",
  ];
  const rows = checks.map((c) => [
    c.id,
    c.checkedAt.toISOString(),
    c.targetId,
    c.target?.name,
    c.target?.url,
    c.status,
    c.statusCode ?? "",
    c.responseTimeMs ?? "",
    c.errorMessage ?? "",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="health-check-report.csv"');
  return res.send(csv);
});

app.get("/api/reports/alerts", authMiddleware, async (req, res) => {
  const targetId = req.query.targetId ? Number(req.query.targetId) : undefined;
  const type = req.query.type || undefined;
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const format = req.query.format === "csv" ? "csv" : "json";
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 500;

  const alerts = await prisma.alert.findMany({
    where: {
      ...(targetId ? { targetId } : {}),
      ...(type ? { type } : {}),
      ...(from || to
        ? {
            triggeredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      target: { userId: req.user.userId },
    },
    orderBy: { triggeredAt: "desc" },
    take: limit,
    include: { target: { select: { id: true, name: true, url: true } } },
  });

  if (format === "json") return res.json({ count: alerts.length, alerts });

  const header = [
    "id",
    "triggeredAt",
    "targetId",
    "targetName",
    "targetUrl",
    "type",
    "message",
    "sentVia",
    "acknowledged",
  ];
  const rows = alerts.map((a) => [
    a.id,
    a.triggeredAt.toISOString(),
    a.targetId,
    a.target?.name,
    a.target?.url,
    a.type,
    a.message,
    a.sentVia,
    a.acknowledged,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="alerts-report.csv"');
  return res.send(csv);
});

app.get("/api/dashboard/summary", authMiddleware, async (req, res) => {
  const targets = await prisma.target.findMany({ where: { userId: req.user.userId } });
  const checks = await prisma.healthCheck.findMany({
    where: { target: { userId: req.user.userId } },
    orderBy: { checkedAt: "desc" },
    take: 200,
  });
  const upChecks = checks.filter((c) => c.status === "UP").length;
  const uptimePercent = checks.length ? Math.round((upChecks / checks.length) * 100) : 0;
  const latestChecksByTarget = targets.map((t) => {
    const latest = checks.find((c) => c.targetId === t.id);
    return { targetId: t.id, targetName: t.name, latestStatus: latest?.status || "NO_DATA" };
  });
  res.json({
    summary: {
      totalTargets: targets.length,
      activeTargets: targets.filter((t) => t.isActive).length,
      totalChecks: checks.length,
      uptimePercent,
      latestChecksByTarget,
    },
  });
});

app.post("/api/demo/seed", authMiddleware, async (req, res) => {
  const existingTargets = await prisma.target.findMany({
    where: { userId: req.user.userId },
    select: { id: true, name: true, url: true, isActive: true },
  });

  if (existingTargets.length > 0) {
    return res.json({
      message: "Demo seed skipped: targets already exist for this account.",
      createdTargets: 0,
      createdChecks: 0,
      targets: existingTargets,
    });
  }

  const demoTargets = [
    {
      userId: req.user.userId,
      name: "Demo Target App",
      url: "http://localhost:5001/health",
      method: "GET",
      intervalSec: 30,
      timeoutMs: 5000,
      expectedStatus: 200,
      isActive: true,
    },
    {
      userId: req.user.userId,
      name: "Backend Health",
      url: "http://localhost:4000/api/health",
      method: "GET",
      intervalSec: 30,
      timeoutMs: 5000,
      expectedStatus: 200,
      isActive: true,
    },
    {
      userId: req.user.userId,
      name: "Intentional Down Example",
      url: "http://localhost:5999/health",
      method: "GET",
      intervalSec: 30,
      timeoutMs: 1500,
      expectedStatus: 200,
      isActive: false,
    },
  ];

  const createdTargets = [];
  for (const targetData of demoTargets) {
    const target = await prisma.target.create({ data: targetData });
    createdTargets.push(target);
  }

  let createdChecks = 0;
  for (const target of createdTargets.filter((t) => t.isActive)) {
    await runCheckForTarget(target);
    createdChecks += 1;
  }

  return res.status(201).json({
    message: "Demo seed created.",
    createdTargets: createdTargets.length,
    createdChecks,
    targets: createdTargets,
  });
});

app.listen(PORT, () => {
  console.log(`HealthPulse backend running on port ${PORT}`);
});
