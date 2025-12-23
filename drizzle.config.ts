import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:mimiverse_dev_password@localhost:5432/mimiverse";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
