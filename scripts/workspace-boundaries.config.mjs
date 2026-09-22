// School's workspace dependency policy, enforced by
// scripts/check-workspace-boundaries.mjs. See docs/architecture/workspace.md.

/** Packages whose runtime is server-only, whatever file imports them. */
const SERVER_ONLY_PACKAGES = [
  "server-only",
  "postgres",
  "pg",
  "ioredis",
  "redis",
  "drizzle-orm",
  "drizzle-kit",
  "drizzle-zod",
  "nodemailer",
  "web-push",
  "sharp",
  "bcryptjs",
  "sqlite-vec",
  "pino",
  "pino-pretty",
  "reflect-metadata",
  "diject",
  "hono",
  "najm-api",
  "najm-cache",
  "najm-chatbot",
  "najm-cookies",
  "najm-core",
  "najm-cors",
  "najm-database",
  "najm-email",
  "najm-event",
  "najm-guard",
  "najm-mcp",
  "najm-rag",
  "najm-rate",
  "najm-storage",
  "najm-validation",
];

const policy = {
  packages: {
    "@sms/dashboard": { dir: "apps/dashboard", role: "app", sources: ["src"] },
    "@sms/contracts": { dir: "packages/contracts", role: "contracts", sources: ["src", "tests"] },
    "@sms/server": { dir: "packages/server", role: "server", sources: ["src", "tests"] },
    "@sms/seed": { dir: "packages/seed", role: "seed", sources: ["src"] },
  },

  // Which workspace roles each role may import, at runtime or as types.
  allowedDependencies: {
    app: ["contracts", "server"],
    server: ["contracts"],
    seed: ["server", "contracts"],
    contracts: [],
  },

  contracts: {
    // Audited portable dependencies. The i18n entry is the definition helper
    // only, never the server plugin; faker and nanoid serve ./fixtures.
    allowedExternal: ["najm-i18n/define", "@faker-js/faker", "nanoid"],
    // Contract tests run under Bun; the runner is not a package dependency.
    allowedInTests: ["bun:test"],
  },

  browser: {
    entryRoles: ["app"],
    forbiddenRoles: ["server", "seed"],
    forbiddenExternal: [
      ...SERVER_ONLY_PACKAGES,
      "najm-auth/server",
      "najm-i18n/server",
      "najm-next/app/next",
      "najm-next/app/server",
      "najm-next/config",
      "najm-next/location/server",
      "najm-theme/server",
      "najm-theme/pg",
    ],
    // Audited client entries of packages whose root is server-only. Read the
    // published entry's imports before adding one; never add a root package.
    //   najm-chatbot/react: React, AI SDK and najm-auth client imports only.
    // najm-kit/server is not listed as forbidden at all: despite its name it
    // is pure constants and cookie/fetch helpers with no Node or server import.
    allowedExternal: ["najm-chatbot/react"],
    // The by-key enum registry names every tuple; importing it from a
    // component would keep all of them alive in the client bundle.
    forbiddenSpecifiers: ["@sms/contracts/lookup"],
  },
};

export default policy;
