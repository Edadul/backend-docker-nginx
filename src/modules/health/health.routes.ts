import { Router } from "express";

export const healthRouter: Router = Router();

healthRouter.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Health check passed",
    service: "Backend API",
    timestamp: new Date().toISOString(),
  });
});
