const express = require("express");
const cors = require("cors");
require("dotenv").config();
const analyzeRoutes = require("./routes/analyze");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/analyze", analyzeRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Working");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});