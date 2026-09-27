import type { Request, Response } from "express";
import { ProductsRepository } from "./products.repository.js";

export class ProductsController {
  private productsRepository: ProductsRepository;

  constructor() {
    this.productsRepository = new ProductsRepository();
  }

  public getAllProducts(req: Request, res: Response): void {
    const products = this.productsRepository.getAllProducts();
    res.json(products);
  }

  public getProductById(req: Request<{ id: string }>, res: Response): void {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid product ID" });
      return;
    }

    const product = this.productsRepository.getProductById(id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  }
}
