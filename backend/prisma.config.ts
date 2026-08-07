
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

const hasExplicitDatabaseUrl = Boolean(process.env.DATABASE_URL);
dotenv.config();
if (
  process.env.NODE_ENV !== "production" &&
  !hasExplicitDatabaseUrl
) {
  dotenv.config({ path: ".env.local", override: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
