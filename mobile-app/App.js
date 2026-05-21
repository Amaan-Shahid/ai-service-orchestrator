import React, { useEffect, useState } from "react";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import ProviderScreen from "./screens/ProviderScreen";
import { registerForPushNotifications } from "./services/notifications";
import { loadSession } from "./services/session";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialSession, setInitialSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession()
      .then(setInitialSession)
      .catch(() => setInitialSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialSession?.account) {
      registerForPushNotifications(initialSession.account).catch(() => {});
    }
  }, [initialSession?.account]);

  if (loading) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#070710",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const initialRouteName = initialSession?.account
    ? initialSession.account.role === "provider"
      ? "Provider"
      : "Customer"
    : "Login";

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#070710",
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="Customer"
          component={HomeScreen}
          initialParams={initialSession || undefined}
        />
        <Stack.Screen
          name="Provider"
          component={ProviderScreen}
          initialParams={initialSession || undefined}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
