import React, { useMemo, useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import API, { getErrorMessage } from "../services/api";
import { registerForPushNotifications } from "../services/notifications";
import { saveSession } from "../services/session";
import { colors, shadow } from "./theme";

const services = [
  "AC Technician",
  "Electrician",
  "Plumber",
  "Painter",
  "Carpenter",
  "Home Cleaner",
  "Mobile Repair",
  "Tutor",
  "Beautician",
];

const emptyProviderProfile = {
  service: "AC Technician",
  location: "",
  rating: "",
  service_radius_km: "",
  available: true,
  experience_years: "",
  languages: "",
  response_time_minutes: "",
  completed_jobs: "",
};

const brandName = "Servio";
const brandInitials = "SO";

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [providerProfile, setProviderProfile] = useState(emptyProviderProfile);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const isRegistering = mode === "register";
  const title = isRegistering ? "Create account" : "Welcome back";
  const actionText = useMemo(() => {
    if (isRegistering) {
      return role === "provider" ? "Register Provider" : "Register Customer";
    }

    return role === "provider" ? "Open Provider Hub" : "Open Customer App";
  }, [isRegistering, role]);

  function updateProviderProfile(key, value) {
    setProviderProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFeedback() {
    if (formError) {
      setFormError("");
    }
  }

  async function handleSubmit() {
    resetFeedback();

    if (!username.trim() || !password) {
      setFormError("Username and password are required.");
      return;
    }

    if (isRegistering && (!name.trim() || !phone.trim())) {
      setFormError("Name and phone number are required for registration.");
      return;
    }

    if (
      isRegistering &&
      role === "provider" &&
      !providerProfile.location.trim()
    ) {
      setFormError("Service area is required for provider registration.");
      return;
    }

    setLoading(true);

    try {
      const payload = isRegistering
        ? {
            role,
            name: name.trim(),
            phone: phone.trim(),
            username: username.trim(),
            password,
            providerProfile:
              role === "provider"
                ? {
                    ...providerProfile,
                    name: name.trim(),
                    phone: phone.trim(),
                  }
                : undefined,
          }
        : {
            role,
            username: username.trim(),
            password,
          };

      const res = await API.post(
        isRegistering ? "/auth/register" : "/auth/login",
        payload
      );

      await openApp(res.data);
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(
        isRegistering
          ? message
          : "Username or password is incorrect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openApp(authResult) {
    const account = authResult.account;
    await saveSession(authResult);
    registerForPushNotifications(account).catch(() => {});

    navigation.replace(account.role === "provider" ? "Provider" : "Customer", {
      account,
      token: authResult.token,
    });
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFormError("");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>{brandInitials}</Text>
          </View>
          <Text style={styles.brandText}>{brandName}</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>AI-powered local services</Text>
            <Text style={styles.title}>
              What service do you need today?
            </Text>
            <Text style={styles.subtitle}>
              Sign in or register to book providers, track jobs, and manage
              service requests from one professional dashboard.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            {["login", "register"].map((item) => (
              <Pressable
                key={item}
                style={[styles.modeButton, mode === item && styles.activeMode]}
                onPress={() => switchMode(item)}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === item && styles.activeModeText,
                  ]}
                >
                  {item === "login" ? "Login" : "Register"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.formTitle}>{title}</Text>

          <Text style={styles.sectionLabel}>Role</Text>
          <View style={styles.roleRow}>
            {["user", "provider"].map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.roleButton,
                  role === item && styles.activeRoleButton,
                ]}
                onPress={() => {
                  setRole(item);
                  setFormError("");
                }}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === item && styles.activeRoleText,
                  ]}
                >
                  {item === "user" ? "Customer" : "Provider"}
                </Text>
              </Pressable>
            ))}
          </View>

          {isRegistering && (
            <View style={styles.twoColumn}>
              <TextInput
                placeholder="Full name"
                placeholderTextColor="#706F99"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
              <TextInput
                placeholder="Phone number"
                placeholderTextColor="#706F99"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          )}

          <TextInput
            placeholder="Username"
            placeholderTextColor="#706F99"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#706F99"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          {isRegistering && role === "provider" && (
            <View style={styles.providerPanel}>
              <Text style={styles.sectionLabel}>Provider profile</Text>

              <Text style={styles.fieldLabel}>Service type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serviceRow}
              >
                {services.map((service) => (
                  <Pressable
                    key={service}
                    style={[
                      styles.serviceChip,
                      providerProfile.service === service &&
                        styles.activeServiceChip,
                    ]}
                    onPress={() => updateProviderProfile("service", service)}
                  >
                    <Text
                      style={[
                        styles.serviceChipText,
                        providerProfile.service === service &&
                          styles.activeServiceChipText,
                      ]}
                    >
                      {service}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                placeholder="Service area, e.g. G-13"
                placeholderTextColor="#706F99"
                value={providerProfile.location}
                onChangeText={(value) => updateProviderProfile("location", value)}
                style={styles.input}
              />

              <View style={styles.twoColumn}>
                <TextInput
                  placeholder="Rating"
                  placeholderTextColor="#706F99"
                  value={providerProfile.rating}
                  onChangeText={(value) => updateProviderProfile("rating", value)}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Service radius km"
                  placeholderTextColor="#706F99"
                  value={providerProfile.service_radius_km}
                  onChangeText={(value) =>
                    updateProviderProfile("service_radius_km", value)
                  }
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>

              <View style={styles.twoColumn}>
                <TextInput
                  placeholder="Experience years"
                  placeholderTextColor="#706F99"
                  value={providerProfile.experience_years}
                  onChangeText={(value) =>
                    updateProviderProfile("experience_years", value)
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Response minutes"
                  placeholderTextColor="#706F99"
                  value={providerProfile.response_time_minutes}
                  onChangeText={(value) =>
                    updateProviderProfile("response_time_minutes", value)
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>

              <TextInput
                placeholder="Languages, comma separated"
                placeholderTextColor="#706F99"
                value={providerProfile.languages}
                onChangeText={(value) => updateProviderProfile("languages", value)}
                style={styles.input}
              />
              <TextInput
                placeholder="Completed jobs"
                placeholderTextColor="#706F99"
                value={providerProfile.completed_jobs}
                onChangeText={(value) =>
                  updateProviderProfile("completed_jobs", value)
                }
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          )}

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{actionText}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchLink}
            onPress={() => switchMode(isRegistering ? "login" : "register")}
          >
            <Text style={styles.switchLinkText}>
              {isRegistering
                ? "Already have an account? Login"
                : "New here? Register a user or provider"}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.select({ android: 44, ios: 56, default: 32 }),
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
  },
  hero: {
    marginBottom: 18,
  },
  heroCopy: {
    paddingVertical: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 44,
    maxWidth: 620,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 720,
  },
  card: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  modeRow: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
    padding: 5,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    padding: 12,
  },
  activeMode: {
    backgroundColor: colors.primary,
  },
  modeText: {
    color: colors.muted,
    fontWeight: "900",
  },
  activeModeText: {
    color: "#FFFFFF",
  },
  formTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 16,
  },
  sectionLabel: {
    color: "#7978A6",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  roleButton: {
    alignItems: "center",
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  activeRoleButton: {
    backgroundColor: "rgba(109,93,251,0.24)",
    borderColor: colors.primary,
  },
  roleText: {
    color: colors.muted,
    fontWeight: "900",
  },
  activeRoleText: {
    color: "#FFFFFF",
  },
  twoColumn: {
    gap: 0,
  },
  input: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
    minHeight: 50,
    padding: 14,
  },
  providerPanel: {
    backgroundColor: "#121220",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    padding: 14,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  serviceRow: {
    gap: 8,
    paddingBottom: 12,
  },
  serviceChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeServiceChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceChipText: {
    color: colors.muted,
    fontWeight: "800",
  },
  activeServiceChipText: {
    color: "#FFFFFF",
  },
  errorText: {
    backgroundColor: "rgba(251,113,133,0.14)",
    borderColor: "rgba(251,113,133,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    color: colors.danger,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 12,
    padding: 12,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 54,
    padding: 14,
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  switchLink: {
    alignItems: "center",
    paddingTop: 16,
  },
  switchLinkText: {
    color: colors.accent,
    fontWeight: "900",
  },
});
