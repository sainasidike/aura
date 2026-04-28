import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["POSTGRES_PRISMA_URL"],
  },
});
