const crypto = require("crypto");
const db = require("../config/firebase");
const dataset = require("../dataset/providers.json");
const withTimeout = require("../utils/asyncTimeout");

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "dev-auth-token-secret";
const FIRESTORE_TIMEOUT_MS = Number(process.env.FIRESTORE_TIMEOUT_MS) || 10000;

function normalizeUsername(username) {
  return username?.trim().toLowerCase() || "";
}

function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
}

function accountDocId(username, role) {
  return Buffer.from(`${role}:${normalizeUsername(username)}`).toString("base64url");
}

function createToken(account) {
  const payload = {
    id: account.id,
    username: account.username,
    role: account.role,
    providerId: account.providerId || null,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function getProviderByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  const providerByCredential = dataset.providers.find(
    (provider) => normalizeUsername(provider.username) === normalizedUsername
  );

  if (providerByCredential) {
    return providerByCredential;
  }

  const match = normalizedUsername.match(/^provider-?(\d+)$/);
  if (!match) {
    return null;
  }

  const providerId = Number(match[1]);
  return dataset.providers.find((provider) => provider.id === providerId) || null;
}

function publicAccount(account) {
  return {
    id: account.id,
    name: account.name || null,
    phone: account.phone || null,
    username: account.username,
    role: account.role,
    providerId: account.providerId || null,
    provider: account.provider || null,
  };
}

async function findAccount(username, role) {
  const normalizedUsername = normalizeUsername(username);
  const doc = await withTimeout(
    db.collection("accounts").doc(accountDocId(normalizedUsername, role)).get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore account lookup timed out"
  );

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

function normalizeProviderProfile(providerProfile, fallback) {
  if (fallback) {
    return {
      id: fallback.id,
      name: fallback.name,
      service: fallback.service,
      location: fallback.location,
      rating: fallback.rating,
      service_radius_km: fallback.service_radius_km,
      available: fallback.available,
      experience_years: fallback.experience_years,
      languages: fallback.languages,
      phone: fallback.phone,
      response_time_minutes: fallback.response_time_minutes,
      completed_jobs: fallback.completed_jobs,
      username: fallback.username,
    };
  }

  if (!providerProfile) {
    return null;
  }

  const name = providerProfile.name?.trim();
  const service = providerProfile.service?.trim();
  const location = providerProfile.location?.trim();
  const phone = providerProfile.phone?.trim();

  if (!name || !service || !location || !phone) {
    return null;
  }

  return {
    id: Number(providerProfile.id) || Date.now(),
    name,
    service,
    location,
    rating: Number(providerProfile.rating) || 4.5,
    service_radius_km: Number(providerProfile.service_radius_km) || 5,
    available: providerProfile.available !== false,
    experience_years: Number(providerProfile.experience_years) || 1,
    languages: Array.isArray(providerProfile.languages)
      ? providerProfile.languages
      : String(providerProfile.languages || "Urdu")
          .split(",")
          .map((language) => language.trim())
          .filter(Boolean),
    phone,
    response_time_minutes: Number(providerProfile.response_time_minutes) || 30,
    completed_jobs: Number(providerProfile.completed_jobs) || 0,
  };
}

async function registerAccount({
  username,
  password,
  role,
  name,
  phone,
  providerId,
  providerProfile,
}) {
  const normalizedUsername = normalizeUsername(username);

  if (
    !normalizedUsername ||
    !password ||
    !name?.trim() ||
    !phone?.trim() ||
    !["user", "provider"].includes(role)
  ) {
    const error = new Error("name, phone, username, password, and valid role are required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await findAccount(normalizedUsername, role);

  if (existing) {
    const error = new Error("account already exists");
    error.statusCode = 409;
    throw error;
  }

  let provider = null;

  if (role === "provider") {
    const datasetProvider = dataset.providers.find(
      (item) => item.id === Number(providerId)
    );
    provider = normalizeProviderProfile(providerProfile, datasetProvider);

    if (!provider) {
      const error = new Error("provider profile details are required for provider signup");
      error.statusCode = 400;
      throw error;
    }
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const account = {
    name: name.trim(),
    phone: phone.trim(),
    username: normalizedUsername,
    role,
    providerId: provider?.id || null,
    provider,
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date(),
  };

  const docRef = db.collection("accounts").doc(accountDocId(normalizedUsername, role));
  await withTimeout(
    docRef.set(account),
    FIRESTORE_TIMEOUT_MS,
    "Firestore account save timed out"
  );
  const savedAccount = {
    id: docRef.id,
    ...account,
  };

  return {
    account: publicAccount(savedAccount),
    token: createToken(savedAccount),
  };
}

async function loginAccount({ username, password, role }) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || !password || !["user", "provider"].includes(role)) {
    const error = new Error("username, password, and valid role are required");
    error.statusCode = 400;
    throw error;
  }

  const account = await findAccount(normalizedUsername, role);

  if (account) {
    const passwordHash = hashPassword(password, account.passwordSalt);

    if (passwordHash !== account.passwordHash) {
      const error = new Error("invalid username or password");
      error.statusCode = 401;
      throw error;
    }

    return {
      account: publicAccount(account),
      token: createToken(account),
    };
  }

  const provider = role === "provider" ? getProviderByUsername(normalizedUsername) : null;
  const expectedProviderPassword = provider?.password || `provider${provider?.id}`;

  if (!provider || password !== expectedProviderPassword) {
    const error = new Error("invalid username or password");
    error.statusCode = 401;
    throw error;
  }

  return registerAccount({
    username: normalizedUsername,
    password,
    role,
    name: provider.name,
    phone: provider.phone,
    providerId: provider.id,
  });
}

async function changePassword({ username, role, currentPassword, newPassword }) {
  const normalizedUsername = normalizeUsername(username);

  if (
    !normalizedUsername ||
    !currentPassword ||
    !newPassword ||
    !["user", "provider"].includes(role)
  ) {
    const error = new Error("username, role, current password, and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error("new password must be at least 6 characters");
    error.statusCode = 400;
    throw error;
  }

  const account = await findAccount(normalizedUsername, role);

  if (!account) {
    const error = new Error("invalid username or password");
    error.statusCode = 401;
    throw error;
  }

  const currentPasswordHash = hashPassword(currentPassword, account.passwordSalt);

  if (currentPasswordHash !== account.passwordHash) {
    const error = new Error("current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const nextSalt = crypto.randomBytes(16).toString("hex");
  const docRef = db.collection("accounts").doc(accountDocId(normalizedUsername, role));

  await withTimeout(
    docRef.update({
      passwordSalt: nextSalt,
      passwordHash: hashPassword(newPassword, nextSalt),
      updatedAt: new Date(),
    }),
    FIRESTORE_TIMEOUT_MS,
    "Firestore password update timed out"
  );

  return {
    success: true,
  };
}

async function updateProfile({ username, role, name, phone }) {
  const normalizedUsername = normalizeUsername(username);
  const trimmedName = name?.trim();
  const trimmedPhone = phone?.trim();

  if (
    !normalizedUsername ||
    !trimmedName ||
    !trimmedPhone ||
    !["user", "provider"].includes(role)
  ) {
    const error = new Error("username, role, name, and phone are required");
    error.statusCode = 400;
    throw error;
  }

  const account = await findAccount(normalizedUsername, role);

  if (!account) {
    const error = new Error("account not found");
    error.statusCode = 404;
    throw error;
  }

  const profileUpdates = {
    name: trimmedName,
    phone: trimmedPhone,
    updatedAt: new Date(),
  };

  if (account.provider) {
    profileUpdates.provider = {
      ...account.provider,
      name: trimmedName,
      phone: trimmedPhone,
    };
  }

  const docRef = db.collection("accounts").doc(accountDocId(normalizedUsername, role));

  await withTimeout(
    docRef.update(profileUpdates),
    FIRESTORE_TIMEOUT_MS,
    "Firestore profile update timed out"
  );

  return {
    account: publicAccount({
      ...account,
      ...profileUpdates,
    }),
  };
}

module.exports = {
  changePassword,
  loginAccount,
  registerAccount,
  updateProfile,
};
