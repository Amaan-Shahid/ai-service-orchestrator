export const colors = {
  background: "#070710",
  backgroundSoft: "#0D0D18",
  surface: "#171725",
  surfaceMuted: "#202033",
  text: "#FFFFFF",
  muted: "#A8A7D6",
  border: "#2C2B45",
  primary: "#6D5DFB",
  primaryDark: "#4F46E5",
  accent: "#14B8A6",
  accentPink: "#F472B6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#FB7185",
};

export const shadow = {
  shadowColor: "#000000",
  shadowOffset: {
    width: 0,
    height: 10,
  },
  shadowOpacity: 0.25,
  shadowRadius: 20,
  elevation: 3,
};

export function statusLabel(status) {
  const labels = {
    confirmed: "Confirmed",
    provider_assigned: "Assigned",
    provider_on_the_way: "On the way",
    completed: "Completed",
    failed: "Needs review",
  };

  return labels[status] || "Pending";
}
