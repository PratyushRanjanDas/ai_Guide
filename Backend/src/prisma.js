import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

// Parse the DATABASE_URL manually to ensure the adapter gets the correct config
const dbUrl = new URL(process.env.DATABASE_URL);
const adapterConfig = {
  host: dbUrl.hostname,
  port: dbUrl.port ? parseInt(dbUrl.port) : 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: decodeURIComponent(dbUrl.pathname.replace("/", "")),
  allowPublicKeyRetrieval: true
};

const adapter = new PrismaMariaDb(adapterConfig);

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // Pass the adapter to the Prisma compiler engine
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
