import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

envCheck();

function envCheck() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET as string
};
