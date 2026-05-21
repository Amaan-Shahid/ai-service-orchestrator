const express = require("express");
const cors = require("cors");
require("dotenv").config();
const analyzeRoutes = require("./routes/analyze");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const notificationRoutes = require("./routes/notifications");
const providerRoutes = require("./routes/providers");
const {
  startNotificationScheduler,
} = require("./services/notificationScheduler");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/analyze", analyzeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/providers", providerRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startNotificationScheduler();
});

app.get("/", (req, res) => {
  res.json({
    message:
      "AI Service Orchestrator API Running",
  });
});
