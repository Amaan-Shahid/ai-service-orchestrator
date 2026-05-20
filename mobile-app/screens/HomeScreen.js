import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import API, { getApiBaseURL, getErrorMessage } from "../services/api";
import { colors, shadow, statusLabel } from "./theme";

const navItems = [
  { id: "request", label: "New Request", icon: "N" },
  { id: "bookings", label: "Bookings", icon: "B" },
  { id: "providers", label: "Providers", icon: "P" },
  { id: "settings", label: "Settings", icon: "S" },
];

const steps = [
  "confirmed",
  "provider_assigned",
  "provider_on_the_way",
  "completed",
];

const sampleRequests = [
  "Need an AC technician in G-13 tomorrow morning",
  "Book an electrician in G-11 today evening",
  "Need home cleaning in F-8 on Saturday",
  "Need a plumber in F-8 this weekend",
];

const providerServices = [
  "All",
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

const themeOptions = [
  {
    id: "midnight",
    name: "Midnight AI",
    description: "Dark dashboard with violet and teal highlights.",
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
    description: "High-energy teal, pink, and indigo accents.",
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
    description: "Bright operational theme for daytime use.",
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

function Stat({ label, value, palette, tone = "default" }) {
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: palette.surface,
          borderColor: tone === "hot" ? palette.primary : palette.border,
        },
      ]}
    >
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function ShellNav({ activeSection, setActiveSection, isWide, palette }) {
  const content = (
    <>
      {navItems.map((item) => (
        <Pressable
          key={item.id}
          style={[
            isWide ? styles.sidebarItem : styles.topNavItem,
            {
              backgroundColor:
                activeSection === item.id ? `${palette.primary}33` : palette.surface,
              borderColor:
                activeSection === item.id ? palette.primary : palette.border,
            },
          ]}
          onPress={() => setActiveSection(item.id)}
        >
          <Text style={[styles.navIcon, { color: palette.accent }]}>
            {item.icon}
          </Text>
          <Text
            style={[
              styles.navLabel,
              {
                color: activeSection === item.id ? palette.text : palette.muted,
              },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </>
  );

  if (isWide) {
    return (
      <View
        style={[
          styles.sidebar,
          { backgroundColor: palette.nav, borderRightColor: palette.border },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: palette.primary }]}>
            <Text style={styles.brandMarkText}>LA</Text>
          </View>
          <Text style={[styles.brandText, { color: palette.text }]}>Local AI</Text>
        </View>
        <Text style={[styles.navSectionLabel, { color: palette.muted }]}>
          Navigation
        </Text>
        {content}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.topNav,
        { backgroundColor: palette.nav, borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.brandRowCompact}>
        <View
          style={[styles.brandMarkSmall, { backgroundColor: palette.primary }]}
        >
          <Text style={styles.brandMarkText}>LA</Text>
        </View>
        <Text style={[styles.brandText, { color: palette.text }]}>Local AI</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topNavScroll}
      >
        {content}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const [account, setAccount] = useState(route.params?.account || {});
  const username = account?.username;
  const isWide = width >= 920;

  const [activeSection, setActiveSection] = useState("request");
  const [message, setMessage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerFilter, setProviderFilter] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("midnight");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState(account?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(account?.phone || "");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const activeTheme =
    themeOptions.find((theme) => theme.id === selectedTheme) || themeOptions[0];
  const palette = activeTheme.palette;

  const activeBookings = useMemo(
    () => bookings.filter((item) => item.status !== "completed").length,
    [bookings]
  );

  useEffect(() => {
    if (route.params?.account) {
      setAccount(route.params.account);
      setFullName(route.params.account.name || "");
      setPhoneNumber(route.params.account.phone || "");
    }
  }, [route.params?.account]);

  const filteredProviders = useMemo(() => {
    if (providerFilter === "All") {
      return providers;
    }

    return providers.filter((provider) => provider.service === providerFilter);
  }, [providerFilter, providers]);

  const loadBookings = useCallback(async () => {
    if (!username) {
      return;
    }

    setRefreshing(true);

    try {
      const res = await API.get("/bookings", {
        params: {
          role: "user",
          username,
        },
      });

      setBookings(res.data.bookings || []);
    } catch (error) {
      Alert.alert("Could not load bookings", getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [username]);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);

    try {
      const res = await API.get("/providers");
      setProviders(res.data.providers || []);
    } catch (error) {
      Alert.alert("Could not load providers", getErrorMessage(error));
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadProviders();
  }, [loadBookings, loadProviders]);

  async function handleBooking() {
    if (!message.trim()) {
      Alert.alert("Missing request", "Describe the service you need.");
      return;
    }

    setLoading(true);
    setAvailabilityMessage("");

    try {
      const res = await API.post("/analyze", {
        username,
        message: message.trim(),
      });

      if (res.data.serviceAvailable === false || !res.data.savedBooking) {
        setAvailabilityMessage(
          "Service is not available right now for this request. Try another service or area."
        );
        return;
      }

      setMessage("");
      setBookings((current) => [res.data.savedBooking, ...current]);
      setActiveSection("bookings");
    } catch (error) {
      if (error?.response?.status === 404) {
        setAvailabilityMessage(
          error.response.data?.error ||
            "Service is not available right now for this request."
        );
        return;
      }

      Alert.alert("Booking failed", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function completeBooking(booking) {
    try {
      const res = await API.patch(`/bookings/${booking.id}/status`, {
        role: "user",
        username,
        status: "completed",
      });

      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? res.data.booking : item))
      );
    } catch (error) {
      Alert.alert("Could not update booking", getErrorMessage(error));
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
        role: account?.role || "user",
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

  async function handleProfileUpdate() {
    setProfileError("");
    setProfileMessage("");

    const name = fullName.trim();
    const phone = phoneNumber.trim();

    if (!name || !phone) {
      setProfileError("Full name and phone number are required.");
      return;
    }

    setProfileLoading(true);

    try {
      const res = await API.patch("/auth/profile", {
        username,
        role: account?.role || "user",
        name,
        phone,
      });
      const updatedAccount = res.data.account;

      setAccount(updatedAccount);
      navigation?.setParams({ account: updatedAccount });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setProfileLoading(false);
    }
  }

  function renderBooking(item) {
    const activeIndex = steps.indexOf(item.status);
    const canComplete = item.status === "provider_on_the_way";

    return (
      <View
        key={item.id}
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

        <View style={styles.detailGrid}>
          <Detail
            palette={palette}
            label="Provider"
            value={item.provider?.name || "Matching provider"}
          />
          <Detail
            palette={palette}
            label="Schedule"
            value={item.scheduledTime || item.scheduledAt || "To be confirmed"}
          />
          <Detail palette={palette} label="Location" value={item.location || "Not set"} />
          <Detail
            palette={palette}
            label="Estimate"
            value={item.estimatedCost || "Discuss with provider"}
          />
        </View>

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

        {canComplete && (
          <Pressable
            style={[styles.secondaryButton, { borderColor: palette.primary }]}
            onPress={() => completeBooking(item)}
          >
            <Text style={[styles.secondaryButtonText, { color: palette.text }]}>
              Confirm Completed
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderProvider(provider) {
    return (
      <View
        key={provider.id}
        style={[
          styles.providerCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={styles.providerTop}>
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Text style={styles.avatarText}>
              {provider.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </Text>
          </View>
          <View style={styles.providerMain}>
            <Text style={[styles.providerName, { color: palette.text }]}>
              {provider.name}
            </Text>
            <Text style={[styles.providerMeta, { color: palette.muted }]}>
              {provider.service} - {provider.location}
            </Text>
          </View>
          <Text
            style={[
              styles.availabilityPill,
              !provider.available && styles.unavailablePill,
            ]}
          >
            {provider.available ? "Available" : "Offline"}
          </Text>
        </View>

        <View style={styles.providerStats}>
          <MiniMetric palette={palette} label="Rating" value={provider.rating} />
          <MiniMetric
            palette={palette}
            label="Radius"
            value={`${provider.service_radius_km} km`}
          />
          <MiniMetric palette={palette} label="Jobs" value={provider.completed_jobs} />
          <MiniMetric
            palette={palette}
            label="ETA"
            value={`${provider.response_time_minutes}m`}
          />
        </View>

        <View style={styles.languageRow}>
          {(provider.languages || []).slice(0, 3).map((language) => (
            <Text
              key={language}
              style={[
                styles.languageChip,
                { backgroundColor: `${palette.accent}24`, color: palette.accent },
              ]}
            >
              {language}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  function renderContent() {
    if (activeSection === "bookings") {
      return (
        <View>
          <SectionHeader
            palette={palette}
            eyebrow="Booking history"
            title="Your service timeline"
            subtitle="Track assignments, provider movement, and completed jobs without cluttering the request screen."
          />
          <View style={styles.statsRow}>
            <Stat palette={palette} label="Active" value={activeBookings} tone="hot" />
            <Stat palette={palette} label="Total" value={bookings.length} />
            <Stat
              palette={palette}
              label="Completed"
              value={bookings.filter((item) => item.status === "completed").length}
            />
          </View>
          <Pressable
            style={[styles.ghostButton, { borderColor: palette.border }]}
            onPress={loadBookings}
          >
            <Text style={[styles.ghostButtonText, { color: palette.accent }]}>
              {refreshing ? "Refreshing..." : "Refresh bookings"}
            </Text>
          </Pressable>
          <View style={styles.stack}>
            {bookings.length ? (
              bookings.map(renderBooking)
            ) : (
              <EmptyState
                palette={palette}
                title="No bookings yet"
                text="Create a new request and confirmed jobs will appear here."
              />
            )}
          </View>
        </View>
      );
    }

    if (activeSection === "providers") {
      return (
        <View>
          <SectionHeader
            palette={palette}
            eyebrow="Provider network"
            title="Explore available professionals"
            subtitle="Filter by service, compare coverage radius, response time, rating, and completed jobs."
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {providerServices.map((service) => (
              <Pressable
                key={service}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      providerFilter === service ? palette.primary : palette.surface,
                    borderColor:
                      providerFilter === service ? palette.primary : palette.border,
                  },
                ]}
                onPress={() => setProviderFilter(service)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color:
                        providerFilter === service ? "#FFFFFF" : palette.muted,
                    },
                  ]}
                >
                  {service}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {providersLoading ? (
            <View
              style={[
                styles.loadingPanel,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <ActivityIndicator color="#FFFFFF" />
              <Text style={[styles.loadingText, { color: palette.muted }]}>
                Loading providers
              </Text>
            </View>
          ) : (
            <View style={styles.providerGrid}>
              {filteredProviders.map(renderProvider)}
            </View>
          )}
        </View>
      );
    }

    if (activeSection === "settings") {
      return (
        <View>
          <SectionHeader
            palette={palette}
            eyebrow="Preferences"
            title="Personalize your workspace"
            subtitle="Choose a visual theme style, update your password, and review the API endpoint used by this deployment."
          />
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
                <Text style={[styles.themeDescription, { color: palette.muted }]}>
                  {theme.description}
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
              styles.passwordCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Profile details
            </Text>
            <TextInput
              placeholder="Full name"
              placeholderTextColor={palette.muted}
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                setProfileError("");
                setProfileMessage("");
              }}
              style={[
                styles.settingsInput,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            <TextInput
              placeholder="Phone number"
              placeholderTextColor={palette.muted}
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                setProfileError("");
                setProfileMessage("");
              }}
              keyboardType="phone-pad"
              style={[
                styles.settingsInput,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            {profileError ? (
              <Text style={styles.passwordError}>{profileError}</Text>
            ) : null}
            {profileMessage ? (
              <Text style={styles.passwordMessage}>{profileMessage}</Text>
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
              styles.passwordCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Change password
            </Text>
            <TextInput
              placeholder="Current password"
              placeholderTextColor={palette.muted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              style={[
                styles.settingsInput,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            <TextInput
              placeholder="New password"
              placeholderTextColor={palette.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={[
                styles.settingsInput,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor={palette.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={[
                styles.settingsInput,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />
            {passwordError ? (
              <Text style={styles.passwordError}>{passwordError}</Text>
            ) : null}
            {passwordMessage ? (
              <Text style={styles.passwordMessage}>{passwordMessage}</Text>
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
          <View
            style={[
              styles.endpointCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.detailLabel, { color: palette.muted }]}>
              API endpoint
            </Text>
            <Text style={[styles.endpointText, { color: palette.text }]}>
              {getApiBaseURL()}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <SectionHeader
          palette={palette}
          eyebrow="AI-powered local services"
          title={`Hi, ${account?.name || username || "customer"}`}
          subtitle="Describe the service you need in plain language. The AI extracts service, location, and time, then books the best available provider."
        />
        <View style={styles.requestLayout}>
          <View
            style={[
              styles.requestCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Your request
            </Text>
            <TextInput
              placeholder="Example: Need an AC technician in G-13 tomorrow morning"
              placeholderTextColor={palette.muted}
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                setAvailabilityMessage("");
              }}
              multiline
              style={[
                styles.input,
                {
                  backgroundColor: palette.nav,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
            />

            <View style={styles.chipWrap}>
              {sampleRequests.map((sample) => (
                <Pressable
                  key={sample}
                  style={[
                    styles.chip,
                    { backgroundColor: palette.nav, borderColor: palette.border },
                  ]}
                  onPress={() => {
                    setMessage(sample);
                    setAvailabilityMessage("");
                  }}
                >
                  <Text style={[styles.chipText, { color: palette.muted }]}>
                    {sample}
                  </Text>
                </Pressable>
              ))}
            </View>

            {availabilityMessage ? (
              <View style={styles.unavailableBox}>
                <Text style={styles.unavailableTitle}>Service not available</Text>
                <Text style={[styles.unavailableText, { color: palette.text }]}>
                  {availabilityMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: palette.primary },
                loading && styles.disabledButton,
              ]}
              onPress={handleBooking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Find Provider</Text>
              )}
            </Pressable>
          </View>

          <View
            style={[
              styles.tipsCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              Tips for better results
            </Text>
            <Tip
              palette={palette}
              title="Mention the service"
              text="AC repair, cleaning, plumbing, tutoring, and more."
            />
            <Tip
              palette={palette}
              title="Add your location"
              text="Use sector or area names like G-13, F-8, or Saddar."
            />
            <Tip
              palette={palette}
              title="Specify timing"
              text="Try today, tomorrow morning, evening, or weekend."
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.background },
        isWide && styles.wideContainer,
      ]}
    >
      <ShellNav
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isWide={isWide}
        palette={palette}
      />
      <ScrollView contentContainerStyle={styles.content}>{renderContent()}</ScrollView>
    </View>
  );
}

function SectionHeader({ eyebrow, title, subtitle, palette }) {
  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text>
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

function MiniMetric({ label, value, palette }) {
  return (
    <View style={[styles.miniMetric, { backgroundColor: palette.nav }]}>
      <Text style={[styles.miniMetricValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.miniMetricLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function Tip({ title, text, palette }) {
  return (
    <View style={[styles.tip, { borderTopColor: palette.border }]}>
      <View style={[styles.tipDot, { backgroundColor: palette.accent }]} />
      <View style={styles.tipTextBlock}>
        <Text style={[styles.tipTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.tipText, { color: palette.muted }]}>{text}</Text>
      </View>
    </View>
  );
}

function EmptyState({ title, text, palette }) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyText, { color: palette.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wideContainer: {
    flexDirection: "row",
  },
  sidebar: {
    backgroundColor: colors.backgroundSoft,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    padding: 18,
    width: 260,
  },
  topNav: {
    backgroundColor: colors.backgroundSoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  topNavScroll: {
    gap: 8,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  brandRowCompact: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkSmall: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  navSectionLabel: {
    color: "#74739A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  sidebarItem: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    padding: 13,
  },
  topNavItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeNavItem: {
    backgroundColor: "rgba(109,93,251,0.24)",
    borderColor: colors.primary,
  },
  navIcon: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
  },
  navLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800",
  },
  activeNavLabel: {
    color: "#FFFFFF",
  },
  content: {
    flexGrow: 1,
    padding: 18,
  },
  hero: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 780,
  },
  requestLayout: {
    gap: 16,
  },
  requestCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  tipsCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 130,
    padding: 14,
    textAlignVertical: "top",
  },
  chipWrap: {
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 11,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  unavailableBox: {
    backgroundColor: "rgba(251,113,133,0.14)",
    borderColor: "rgba(251,113,133,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  unavailableTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3,
  },
  unavailableText: {
    color: "#FECDD3",
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 52,
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
  tip: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
  },
  tipDot: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  tipTextBlock: {
    flex: 1,
  },
  tipTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  tipText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  stat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  hotStat: {
    borderColor: colors.primary,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.muted,
    marginTop: 2,
  },
  ghostButton: {
    alignSelf: "flex-start",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ghostButtonText: {
    color: colors.accent,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
  bookingCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
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
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  bookingId: {
    color: colors.muted,
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
  detailGrid: {
    gap: 10,
    marginTop: 14,
  },
  detailBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 11,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
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
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 7,
    marginBottom: 6,
  },
  activeStepDot: {
    backgroundColor: colors.primary,
  },
  stepText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  activeStepText: {
    color: colors.primary,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "900",
  },
  filterRow: {
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.muted,
    fontWeight: "900",
  },
  activeFilterChipText: {
    color: "#FFFFFF",
  },
  providerGrid: {
    gap: 12,
  },
  providerCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  providerTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  providerMain: {
    flex: 1,
  },
  providerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  providerMeta: {
    color: colors.muted,
    marginTop: 4,
  },
  availabilityPill: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderRadius: 8,
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  unavailablePill: {
    backgroundColor: "rgba(251,113,133,0.14)",
    color: colors.danger,
  },
  providerStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  miniMetric: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flex: 1,
    padding: 9,
  },
  miniMetricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  miniMetricLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  languageChip: {
    backgroundColor: "rgba(20,184,166,0.14)",
    borderRadius: 8,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  loadingText: {
    color: colors.muted,
    fontWeight: "800",
  },
  settingsGrid: {
    gap: 12,
  },
  themeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  activeThemeCard: {
    borderColor: colors.primary,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  themeDescription: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 5,
  },
  selectedTheme: {
    color: colors.accent,
    fontWeight: "900",
    marginTop: 10,
  },
  passwordCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  settingsInput: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginTop: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  passwordError: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
  passwordMessage: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
  endpointCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 15,
  },
  endpointText: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 20,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
