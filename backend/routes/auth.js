const express = require("express");
const {
  changePassword,
  loginAccount,
  registerAccount,
  updateProfile,
} = require("../services/authService");

const router = express.Router();

function sendAuthError(res, error) {
  res.status(error.statusCode || 500).json({
    error: error.message || "Authentication failed",
  });
}

router.post("/register", async (req, res) => {
  try {
    const authResult = await registerAccount(req.body);
    res.status(201).json(authResult);
  } catch (error) {
    sendAuthError(res, error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const authResult = await loginAccount(req.body);
    res.json(authResult);
  } catch (error) {
    sendAuthError(res, error);
  }
});

router.patch("/password", async (req, res) => {
  try {
    const result = await changePassword(req.body);
    res.json(result);
  } catch (error) {
    sendAuthError(res, error);
  }
});

router.patch("/profile", async (req, res) => {
  try {
    const result = await updateProfile(req.body);
    res.json(result);
  } catch (error) {
    sendAuthError(res, error);
  }
});

module.exports = router;
