import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "ai-service-orchestrator-session";

export async function loadSession() {
  const value = await AsyncStorage.getItem(SESSION_KEY);
  return value ? JSON.parse(value) : null;
}

export async function saveSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
