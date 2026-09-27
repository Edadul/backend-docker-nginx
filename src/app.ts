import express from "express";
import { apiRouter } from "./routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

const createApp = (): express.Application => {
  const app = express();
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api", apiRouter);

  return app;
};

export default createApp;
