#!/usr/bin/env node

if (process.env.NODE_ENV === "production") {
  console.error(
    "EduOS production seed is disabled. Use prisma migrate deploy for schema changes and provision real tenant data through the application/admin workflow.",
  );
  process.exit(1);
}

const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["ts-node", "prisma/seed.ts"],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
