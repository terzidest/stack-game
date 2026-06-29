import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "./theme";

interface Props {
  label: string;
  onPress?: () => void; // omit for a decorative pill (e.g. Overlay's tap-anywhere CTA)
  variant?: "primary" | "secondary";
  stretch?: boolean; // alignSelf: "stretch" inside a column
}

export default function PillButton({
  label,
  onPress,
  variant = "primary",
  stretch = false,
}: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        isPrimary ? styles.primary : styles.secondary,
        stretch && styles.stretch,
      ]}
    >
      <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: "center",
  },
  stretch: {
    alignSelf: "stretch",
  },
  primary: {
    backgroundColor: theme.gold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.onGold,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.textSoft,
  },
});
