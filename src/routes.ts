import { Router } from "express";
import { productsRouter } from "./modules/products/products.routes.js";

export const apiRouter: Router = Router();

apiRouter.use("/products", productsRouter);
