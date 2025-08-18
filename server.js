const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { testConnection } = require("./config/database");

const userRoutes = require("./routes/users");
const addressRoutes = require("./routes/addresses");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const categoryRoutes = require("./routes/categories");

const productVariantRoutes = require("./routes/productVariants");
const productImageRoutes = require("./routes/productImages");
const genderRoutes = require("./routes/genders");

const ordersRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Request body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Test database connection on startup
testConnection();

// Routes

app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/categories", categoryRoutes);

app.use("/api/product-variants", productVariantRoutes);
app.use("/api/product-images", productImageRoutes);
app.use("/api/genders", genderRoutes);

app.use("/api/orders", ordersRoutes);

// Test endpoint for debugging
app.post("/api/test", (req, res) => {
  console.log("Test endpoint hit:", req.body);
  res.json({
    message: "Test endpoint working",
    received: req.body,
    headers: req.headers,
  });
});

// Sample route
app.get("/", (req, res) => {
  res.json({
    message: "Clothing Brand API is working!",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      products: "/api/products",
      categories: "/api/categories",
      productVariants: "/api/product-variants",
      productImages: "/api/product-images",
      auth: {
        register: "POST /api/users/register",
        login: "POST /api/users/login",
      },
      profile: {
        get: "GET /api/users/profile",
        update: "PUT /api/users/profile",
        summary: "GET /api/users/account-summary",
        changePassword: "PUT /api/users/change-password",
        deactivate: "PUT /api/users/deactivate",
      },
      addresses: {
        getAll: "GET /api/addresses",
        getOne: "GET /api/addresses/:id",
        add: "POST /api/addresses",
        update: "PUT /api/addresses/:id",
        setDefault: "PUT /api/addresses/:id/set-default",
        delete: "DELETE /api/addresses/:id",
        getDefault: "GET /api/addresses/default/address",
      },
      test: "POST /api/test",
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(
    `🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
  );
});
