import dotenv from "dotenv";
import path from "path";

// Load .env for local dev only — Vercel injects env vars directly
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function envCheck() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

envCheck();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET as string
};
