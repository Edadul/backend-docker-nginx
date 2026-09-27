import mock from "./data/products.mock.js";
import type { Product } from "./products.types.js";

export class ProductsRepository {
  private products: Product[];

  constructor() {
    this.products = mock;
  }

  public getAllProducts(): Product[] {
    return this.products;
  }

  public getProductById(id: number): Product | undefined {
    return this.products.find((product) => product.id === id);
  }
}
