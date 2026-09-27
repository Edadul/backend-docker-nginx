import type { Product } from "../products.types.js";

const mockProducts: Product[] = [
  {
    id: 1,
    name: "Mouse",
    description: "Description for Product 1",
    price: 29.99,
    stock: 100,
  },
  {
    id: 2,
    name: "Keyboard",
    description: "Description for Product 2",
    price: 49.99,
    stock: 50,
  },
  {
    id: 3,
    name: "Monitor",
    description: "Description for Product 3",
    price: 199.99,
    stock: 20,
  },
];

export default mockProducts;
