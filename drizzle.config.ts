import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

// Set environment variable to ignore SSL certificate issues for drizzle-kit
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
