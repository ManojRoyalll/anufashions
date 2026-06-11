import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { errorMiddleware } from "./middleware/error";
import { router } from "./routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "anufashions-api" });
});

app.use("/api", router);
app.use(errorMiddleware);

// For local development
if (process.env.VERCEL !== "1") {
  app.listen(config.port, () => {
    console.log(`API running on port ${config.port}`);
  });
}

// For Vercel serverless
export default app;
