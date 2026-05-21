import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import API from "./api";

const LOCAL_NOTIFICATION_STORAGE_PREFIX = "servio:local-notifications";
const MIN_LOCAL_NOTIFICATION_DELAY_MS = 5000;
const MAX_RECENT_LOCAL_NOTIFICATION_AGE_MS = 60000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getAccountNotificationKey(account) {
  if (!account?.role) {
    return null;
  }

  if (account.role === "provider" && account.providerId) {
    return `${LOCAL_NOTIFICATION_STORAGE_PREFIX}:provider:${account.providerId}`;
  }

  if (account.role === "user" && account.username) {
    return `${LOCAL_NOTIFICATION_STORAGE_PREFIX}:user:${account.username
      .trim()
      .toLowerCase()}`;
  }

  return null;
}

async function ensureNotificationPermissions() {
  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  return finalStatus === "granted";
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#6D5DFB",
  });
}

async function readScheduledLocalNotifications(account) {
  const storageKey = getAccountNotificationKey(account);

  if (!storageKey) {
    return {};
  }

  const rawValue = await AsyncStorage.getItem(storageKey);

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) || {};
  } catch {
    return {};
  }
}

async function writeScheduledLocalNotifications(account, scheduledMap) {
  const storageKey = getAccountNotificationKey(account);

  if (!storageKey) {
    return;
  }

  await AsyncStorage.setItem(storageKey, JSON.stringify(scheduledMap));
}

function isFutureScheduledNotification(notification) {
  if (!notification?.id || notification.status !== "scheduled") {
    return false;
  }

  const scheduledFor = new Date(notification.scheduledFor);

  return (
    !Number.isNaN(scheduledFor.getTime()) &&
    scheduledFor.getTime() - Date.now() > MIN_LOCAL_NOTIFICATION_DELAY_MS
  );
}

function getNotificationTime(notification) {
  const value =
    notification?.scheduledFor || notification?.sentAt || notification?.createdAt;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function shouldPresentImmediateLocalNotification(notification) {
  if (
    !notification?.id ||
    !notification.message ||
    !["scheduled", "sent"].includes(notification.status)
  ) {
    return false;
  }

  const notificationTime = getNotificationTime(notification);

  if (!notificationTime) {
    return false;
  }

  const age = Date.now() - notificationTime.getTime();

  return (
    age >= 0 &&
    age <= MAX_RECENT_LOCAL_NOTIFICATION_AGE_MS &&
    !isFutureScheduledNotification(notification)
  );
}

function getNotificationContent(notification) {
  return {
    title: "Servio",
    body: notification.message || "You have a service update.",
    data: {
      bookingId: notification.bookingId,
      notificationId: notification.id,
      type: notification.type,
    },
  };
}

export async function registerForPushNotifications(account) {
  if (!account || !Device.isDevice || Platform.OS === "web") {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const hasPermission = await ensureNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  const tokenResult = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  await API.post("/notifications/register-token", {
    role: account.role,
    username: account.username,
    providerId: account.providerId,
    token: tokenResult.data,
  });

  return tokenResult.data;
}

export async function syncOutOfAppNotifications(account, notifications) {
  if (!account || Platform.OS === "web") {
    return;
  }

  const hasPermission = await ensureNotificationPermissions();

  if (!hasPermission) {
    return;
  }

  await ensureAndroidNotificationChannel();

  const scheduledMap = await readScheduledLocalNotifications(account);
  const currentNotifications = Array.isArray(notifications) ? notifications : [];
  const nextScheduledMap = { ...scheduledMap };
  const activeNotificationIds = new Set(
    currentNotifications
      .filter(
        (item) =>
          isFutureScheduledNotification(item) ||
          shouldPresentImmediateLocalNotification(item)
      )
      .map((item) => item.id)
  );

  for (const [notificationId, localId] of Object.entries(scheduledMap)) {
    if (!activeNotificationIds.has(notificationId)) {
      if (localId !== "presented") {
        await Notifications.cancelScheduledNotificationAsync(localId).catch(() => {});
      }
      delete nextScheduledMap[notificationId];
    }
  }

  for (const notification of currentNotifications) {
    if (
      !isFutureScheduledNotification(notification) ||
      nextScheduledMap[notification.id]
    ) {
      continue;
    }

    const scheduledFor = new Date(notification.scheduledFor);
    const localId = await Notifications.scheduleNotificationAsync({
      content: getNotificationContent(notification),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledFor,
        channelId: Platform.OS === "android" ? "default" : undefined,
      },
    });

    nextScheduledMap[notification.id] = localId;
  }

  for (const notification of currentNotifications) {
    if (
      !shouldPresentImmediateLocalNotification(notification) ||
      nextScheduledMap[notification.id]
    ) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: getNotificationContent(notification),
      trigger: Platform.OS === "android" ? { channelId: "default" } : null,
    });

    nextScheduledMap[notification.id] = "presented";
  }

  await writeScheduledLocalNotifications(account, nextScheduledMap);
}
