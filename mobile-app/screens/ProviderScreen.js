import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import API, { getErrorMessage } from "../services/api";
import { colors, shadow, statusLabel } from "./theme";

const steps = [
  "confirmed",
  "provider_assigned",
  "provider_on_the_way",
  "completed",
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

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProviderScreen({ route }) {
  const account = route.params?.account;
  const providerId = account?.providerId;

  const [bookings, setBookings] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

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
    } catch (error) {
      Alert.alert("Could not update booking", getErrorMessage(error));
    } finally {
      setLoadingId(null);
    }
  }

  function renderBooking({ item }) {
    const activeIndex = steps.indexOf(item.status);
    const nextStatus = getNextProviderStatus(item.status);
    const isLoading = loadingId === item.id;

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleGroup}>
            <Text style={styles.service}>{item.service || "Service"}</Text>
            <Text style={styles.bookingId}>{item.bookingId || item.id}</Text>
          </View>

          <Text style={styles.statusPill}>{statusLabel(item.status)}</Text>
        </View>

        <View style={styles.customerBox}>
          <Text style={styles.detailLabel}>Customer</Text>
          <Text style={styles.customerName}>
            {item.customer?.username || "Walk-in request"}
          </Text>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{item.location || "Not set"}</Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Schedule</Text>
            <Text style={styles.detailValue}>
              {item.scheduledTime || item.scheduledAt || "To be confirmed"}
            </Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Estimate</Text>
            <Text style={styles.detailValue}>
              {item.estimatedCost || "Discuss with customer"}
            </Text>
          </View>
        </View>

        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  index <= activeIndex && styles.activeStepDot,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  index <= activeIndex && styles.activeStepText,
                ]}
                numberOfLines={1}
              >
                {statusLabel(step)}
              </Text>
            </View>
          ))}
        </View>

        {nextStatus && (
          <Pressable
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={() => updateStatus(item, nextStatus)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {nextStatus === "provider_assigned"
                  ? "Accept Assignment"
                  : "Mark On The Way"}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        refreshing={refreshing}
        onRefresh={loadBookings}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>Provider dashboard</Text>
              <Text style={styles.title}>
                {account?.provider?.name || account?.username || "Provider"}
              </Text>
              <Text style={styles.subtitle}>
                Review assigned jobs, accept the booking, then update the
                customer when you are on the way.
              </Text>

              <View style={styles.statsRow}>
                <Stat label="New" value={stats.assigned} />
                <Stat label="On way" value={stats.onTheWay} />
                <Stat label="Done" value={stats.completed} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Assigned bookings</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No assigned bookings</Text>
            <Text style={styles.emptyText}>
              Pull to refresh after a customer books a matching service.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 18,
    padding: 18,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
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
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  bookingCard: {
    ...shadow,
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  bookingId: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: "rgba(109,93,251,0.18)",
    borderRadius: 8,
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  customerBox: {
    backgroundColor: "rgba(20,184,166,0.14)",
    borderRadius: 8,
    marginTop: 14,
    padding: 12,
  },
  customerName: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  detailGrid: {
    gap: 10,
    marginTop: 10,
  },
  detailBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 11,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  activeStepText: {
    color: colors.primaryDark,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 50,
    padding: 13,
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
    fontWeight: "800",
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
