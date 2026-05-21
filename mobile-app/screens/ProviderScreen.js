import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import API, { getErrorMessage } from "../services/api";
import { syncOutOfAppNotifications } from "../services/notifications";
import { clearSession, saveSession } from "../services/session";
import { colors, shadow, statusLabel } from "./theme";

const steps = [
  "confirmed",
  "provider_assigned",
  "provider_on_the_way",
  "completed",
];

const themeOptions = [
  {
    id: "midnight",
    name: "Midnight AI",
    swatches: ["#070710", "#6D5DFB", "#14B8A6"],
    palette: {
      background: "#070710",
      nav: "#0D0D18",
      surface: "#171725",
      border: "#2C2B45",
      primary: "#6D5DFB",
      accent: "#14B8A6",
      text: "#FFFFFF",
      muted: "#A8A7D6",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    swatches: ["#0B1020", "#F472B6", "#22C55E"],
    palette: {
      background: "#0B1020",
      nav: "#11172A",
      surface: "#161D33",
      border: "#31405F",
      primary: "#F472B6",
      accent: "#22C55E",
      text: "#FFFFFF",
      muted: "#BDD2F6",
    },
  },
  {
    id: "focus",
    name: "Focus Light",
    swatches: ["#F8FAFC", "#2563EB", "#0F766E"],
    palette: {
      background: "#F8FAFC",
      nav: "#FFFFFF",
      surface: "#FFFFFF",
      border: "#D8E0EA",
      primary: "#2563EB",
      accent: "#0F766E",
      text: "#0F172A",
      muted: "#526071",
    },
  },
];

function getNextProviderStatus(status) {
  if (status === "confirmed") {
    return "provider_assigned";
  }

  if (status === "provider_assigned") {
    return "provider_on_the_way";
  }

  return null;
}

function Stat({ label, value, palette }) {
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: palette.nav, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

export default function ProviderScreen({ route, navigation }) {
  const [account, setAccount] = useState(route.params?.account || {});
  const providerId = account?.providerId;
  const username = account?.username;

  const [activeSection, setActiveSection] = useState("jobs");
  const [selectedTheme, setSelectedTheme] = useState("midnight");
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fullName, setFullName] = useState(account?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(account?.phone || "");
  const [location, setLocation] = useState(account?.provider?.location || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const activeTheme =
    themeOptions.find((theme) => theme.id === selectedTheme) || themeOptions[0];
  const palette = activeTheme.palette;

  const stats = useMemo(
    () => ({
      assigned: bookings.filter((item) => item.status === "confirmed").length,
      onTheWay: bookings.filter((item) => item.status === "provider_on_the_way")
        .length,
      completed: bookings.filter((item) => item.status === "completed").length,
    }),
    [bookings]
  );

  const loadBookings = useCallback(async () => {
    if (!providerId) {
      return;
    }

    setRefreshing(true);

    try {
      const res = await API.get("/bookings", {
        params: {
          role: "provider",
          providerId,
        },
      });

      setBookings(res.data.bookings || []);
    } catch (error) {
      Alert.alert("Could not load bookings", getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [providerId]);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!providerId) {
      return;
    }

    try {
      const res = await API.get("/notifications", {
        params: {
          role: "provider",
          providerId,
        },
      });

      const nextNotifications = res.data.notifications || [];
      setNotifications(nextNotifications);
      syncOutOfAppNotifications(account, nextNotifications).catch(() => {});
    } catch (error) {
      if (!silent) {
        Alert.alert("Could not load notifications", getErrorMessage(error));
      }
    }
  }, [account, providerId]);

  useEffect(() => {
    loadBookings();
    loadNotifications();
  }, [loadBookings, loadNotifications]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadNotifications(true);
    }, 15000);

    return () => clearInterval(timer);
  }, [loadNotifications]);

  async function updateStatus(booking, status) {
    setLoadingId(booking.id);

    try {
      const res = await API.patch(`/bookings/${booking.id}/status`, {
        role: "provider",
        providerId,
        status,
      });

      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? res.data.booking : item))
      );
      loadNotifications();
    } catch (error) {
      Alert.alert("Could not update booking", getErrorMessage(error));
    } finally {
      setLoadingId(null);
    }
  }

  async function cancelBooking(booking) {
    setLoadingId(booking.id);

    try {
      const res = await API.patch(`/bookings/${booking.id}/status`, {
        role: "provider",
        providerId,
        status: "cancelled",
      });

      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? res.data.booking : item))
      );
      loadNotifications();
    } catch (error) {
      Alert.alert("Could not cancel booking", getErrorMessage(error));
    } finally {
      setLoadingId(null);
    }
  }

  async function handleProfileUpdate() {
    setProfileError("");
    setProfileMessage("");

    const name = fullName.trim();
    const phone = phoneNumber.trim();
    const serviceArea = location.trim();

    if (!name || !phone || !serviceArea) {
      setProfileError("Name, phone number, and service area are required.");
      return;
    }

    setProfileLoading(true);

    try {
      const res = await API.patch("/auth/profile", {
        username,
        role: "provider",
        name,
        phone,
        location: serviceArea,
      });
      const updatedAccount = res.data.account;

      setAccount(updatedAccount);
      navigation?.setParams({ account: updatedAccount });
      await saveSession({
        account: updatedAccount,
        token: route.params?.token,
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Current password, new password, and confirmation are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordLoading(true);

    try {
      await API.patch("/auth/password", {
        username,
        role: "provider",
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    navigation.replace("Login");
  }

  function renderBooking({ item }) {
    const activeIndex = steps.indexOf(item.status);
    const nextStatus = getNextProviderStatus(item.status);
    const isLoading = loadingId === item.id;
    const canCancel = !["completed", "cancelled", "failed"].includes(item.status);

    return (
      <View
        style={[
          styles.bookingCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Text style={[styles.service, { color: palette.text }]}>
              {item.service || "Service"}
            </Text>
            <Text style={[styles.bookingId, { color: palette.muted }]}>
              {item.bookingId || item.id}
            </Text>
          </View>

          <Text style={styles.statusPill}>{statusLabel(item.status)}</Text>
        </View>

        <View style={[styles.customerBox, { backgroundColor: `${palette.accent}24` }]}>
          <Text style={[styles.detailLabel, { color: palette.muted }]}>Customer</Text>
          <Text style={[styles.customerName, { color: palette.text }]}>
            {item.customer?.username || "Walk-in request"}
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <Detail palette={palette} label="Location" value={item.location || "Not set"} />
          <Detail
            palette={palette}
            label="Schedule"
            value={item.scheduledTime || item.scheduledAt || "To be confirmed"}
          />
          <Detail
            palette={palette}
            label="Estimate"
            value={item.estimatedCost || "Discuss with customer"}
          />
        </View>

        <ReasoningList palette={palette} reasoning={item.reasoning} />

        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      index <= activeIndex ? palette.primary : palette.border,
                  },
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  { color: index <= activeIndex ? palette.primary : palette.muted },
                ]}
                numberOfLines={1}
              >
                {statusLabel(step)}
              </Text>
            </View>
          ))}
        </View>

        {(nextStatus || canCancel) && (
          <View style={styles.bookingActions}>
            {nextStatus && (
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.actionButton,
                  { backgroundColor: palette.primary },
                  isLoading && styles.disabledButton,
                ]}
                onPress={() => updateStatus(item, nextStatus)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {nextStatus === "provider_assigned"
                      ? "Confirm Booking"
                      : "Mark On The Way"}
                  </Text>
                )}
              </Pressable>
            )}
            {canCancel && (
              <Pressable
                style={[
                  styles.cancelButton,
                  { borderColor: colors.danger },
                  isLoading && styles.disabledButton,
                ]}
                onPress={() => cancelBooking(item)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderHeader() {
    return (
      <View>
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            Provider dashboard
          </Text>
          <Text style={[styles.title, { color: palette.text }]}>
            {account?.provider?.name || account?.name || account?.username || "Provider"}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Review assigned jobs, accept bookings, and update customers when you are on the way.
          </Text>

          <View style={styles.statsRow}>
            <Stat palette={palette} label="New" value={stats.assigned} />
            <Stat palette={palette} label="On way" value={stats.onTheWay} />
            <Stat palette={palette} label="Done" value={stats.completed} />
          </View>
        </View>

        <NotificationList palette={palette} notifications={notifications} />

        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Found bookings
        </Text>
      </View>
    );
  }

  function renderSettings() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.accent }]}>Settings</Text>
          <Text style={[styles.title, { color: palette.text }]}>
            Provider preferences
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Update your profile, service area, password, and app theme.
          </Text>
        </View>

        <View style={styles.settingsGrid}>
          {themeOptions.map((theme) => (
            <Pressable
              key={theme.id}
              style={[
                styles.themeCard,
                {
                  backgroundColor: palette.surface,
                  borderColor:
                    selectedTheme === theme.id ? palette.primary : palette.border,
                },
              ]}
              onPress={() => setSelectedTheme(theme.id)}
            >
              <View style={styles.swatchRow}>
                {theme.swatches.map((swatch) => (
                  <View
                    key={swatch}
                    style={[styles.swatch, { backgroundColor: swatch }]}
                  />
                ))}
              </View>
              <Text style={[styles.themeName, { color: palette.text }]}>
                {theme.name}
              </Text>
              {selectedTheme === theme.id ? (
                <Text style={[styles.selectedTheme, { color: palette.accent }]}>
                  Selected
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.settingsCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Profile details
          </Text>
          <SettingsInput
            palette={palette}
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
          />
          <SettingsInput
            palette={palette}
            placeholder="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <SettingsInput
            palette={palette}
            placeholder="Service area, e.g. G-13"
            value={location}
            onChangeText={setLocation}
          />
          {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
          {profileMessage ? (
            <Text style={styles.successText}>{profileMessage}</Text>
          ) : null}
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: palette.primary },
              profileLoading && styles.disabledButton,
            ]}
            onPress={handleProfileUpdate}
            disabled={profileLoading}
          >
            {profileLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Profile</Text>
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.settingsCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            Change password
          </Text>
          <SettingsInput
            palette={palette}
            placeholder="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <SettingsInput
            palette={palette}
            placeholder="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <SettingsInput
            palette={palette}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          {passwordMessage ? (
            <Text style={styles.successText}>{passwordMessage}</Text>
          ) : null}
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: palette.primary },
              passwordLoading && styles.disabledButton,
            ]}
            onPress={handlePasswordChange}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.logoutButton, { borderColor: palette.border }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.topNav,
          { backgroundColor: palette.nav, borderBottomColor: palette.border },
        ]}
      >
        {[
          { id: "jobs", label: "Jobs" },
          { id: "settings", label: "Settings" },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.navButton,
              {
                backgroundColor:
                  activeSection === item.id ? `${palette.primary}33` : palette.surface,
                borderColor:
                  activeSection === item.id ? palette.primary : palette.border,
              },
            ]}
            onPress={() => setActiveSection(item.id)}
          >
            <Text
              style={[
                styles.navButtonText,
                { color: activeSection === item.id ? palette.text : palette.muted },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeSection === "settings" ? (
        renderSettings()
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          refreshing={refreshing}
          onRefresh={() => {
            loadBookings();
            loadNotifications();
          }}
          contentContainerStyle={styles.content}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                No assigned bookings
              </Text>
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                Pull to refresh after a customer books a matching service.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function Detail({ label, value, palette }) {
  return (
    <View style={[styles.detailBlock, { backgroundColor: palette.nav }]}>
      <Text style={[styles.detailLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

function ReasoningList({ reasoning, palette }) {
  const reasons = Array.isArray(reasoning)
    ? reasoning.filter(Boolean)
    : reasoning
      ? [reasoning]
      : [];

  if (!reasons.length) {
    return null;
  }

  return (
    <View
      style={[
        styles.reasoningBox,
        { backgroundColor: palette.nav, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.detailLabel, { color: palette.muted }]}>Reasoning</Text>
      {reasons.map((reason, index) => (
        <View key={`${reason}-${index}`} style={styles.reasonRow}>
          <View style={[styles.reasonDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.reasonText, { color: palette.text }]}>{reason}</Text>
        </View>
      ))}
    </View>
  );
}

function NotificationList({ notifications, palette }) {
  const latestNotifications = Array.isArray(notifications)
    ? notifications.slice(0, 4)
    : [];

  if (!latestNotifications.length) {
    return null;
  }

  return (
    <View
      style={[
        styles.notificationPanel,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.notificationTitle, { color: palette.text }]}>
        Notifications
      </Text>
      {latestNotifications.map((notification) => (
        <View
          key={notification.id}
          style={[styles.notificationItem, { borderTopColor: palette.border }]}
        >
          <View style={[styles.notificationDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.notificationText, { color: palette.muted }]}>
            {notification.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SettingsInput({ palette, style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={palette.muted}
      style={[
        styles.settingsInput,
        {
          backgroundColor: palette.nav,
          borderColor: palette.border,
          color: palette.text,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: Platform.select({ android: 44, ios: 56, default: 28 }),
  },
  navButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  content: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 42,
    paddingTop: 24,
  },
  hero: {
    ...shadow,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  stat: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  bookingCard: {
    ...shadow,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardTitleGroup: {
    flex: 1,
  },
  service: {
    fontSize: 18,
    fontWeight: "900",
  },
  bookingId: {
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderRadius: 8,
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  customerBox: {
    borderRadius: 8,
    marginTop: 14,
    padding: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "900",
  },
  detailGrid: {
    gap: 10,
    marginTop: 10,
  },
  detailBlock: {
    borderRadius: 8,
    padding: 11,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  reasoningBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    padding: 11,
  },
  reasonRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  reasonDot: {
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  notificationPanel: {
    ...shadow,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  notificationItem: {
    alignItems: "flex-start",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
    paddingTop: 10,
  },
  notificationDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  steps: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  stepItem: {
    flex: 1,
  },
  stepDot: {
    borderRadius: 4,
    height: 7,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 10,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 50,
    padding: 13,
  },
  actionButton: {
    flex: 1,
  },
  bookingActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    padding: 13,
  },
  cancelButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  settingsGrid: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  swatchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  swatch: {
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    width: 42,
  },
  themeName: {
    fontSize: 16,
    fontWeight: "900",
  },
  selectedTheme: {
    fontWeight: "900",
    marginTop: 10,
  },
  settingsCard: {
    ...shadow,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  settingsInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 50,
    padding: 13,
  },
  logoutButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
