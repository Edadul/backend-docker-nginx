import { Router } from "express";

export const healthRouter: Router = Router();

healthRouter.get("/", (req, res) => {
  res.status(200).send("OK");
});
