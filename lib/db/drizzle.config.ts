import { defineConfig } from "drizzle-kit";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:wtt%40adm@122.165.225.42:5432/flowmatrix";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
