import axios from "axios";
import { Platform } from "react-native";

function getBaseURL() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

export function getApiBaseURL() {
  return getBaseURL();
}

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 20000,
});

export function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
}

export default API;
