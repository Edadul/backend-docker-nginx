import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/products", (req, res) => {});

app.get("/api/products/:id", (req, res) => {});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
