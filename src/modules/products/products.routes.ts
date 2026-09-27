import { Router } from "express";
import { ProductsController } from "./products.controller.js";

const productsController = new ProductsController();
export const productsRouter: Router = Router();

productsRouter.get("/", (req, res) =>
  productsController.getAllProducts(req, res),
);
productsRouter.get("/:id", (req, res) =>
  productsController.getProductById(req, res),
);
