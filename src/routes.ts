import { Router } from "express";
import { productsRouter } from "./modules/products/products.routes.js";

export const apiRouter: Router = Router();

apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    message: "Welcome to the API",
    endpoints: {
      products: "/products",
      uniqueProducts: "/products/:id",
    },
  });
});

apiRouter.use("/products", productsRouter);
