import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { theme } from "./theme";

interface Props {
  onBackdropPress: () => void;
  children: React.ReactNode;
}

// Full-screen glass modal: a light scrim (sky stays visible) wrapping a
// translucent panel that scales + fades in on mount. The panel swallows taps so
// they don't reach the backdrop. Mounts only when its parent renders it (the
// Pause/Settings components return null when closed), so mount === open.
export default function ModalCard({ onBackdropPress, children }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdropStyle = useAnimatedStyle(() => {
    "worklet";
    return { opacity: t.value };
  });

  const panelStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: t.value,
      transform: [{ scale: interpolate(t.value, [0, 1], [0.92, 1]) }],
    };
  });

  return (
    <Animated.View style={[styles.backdrop, backdropStyle]}>
      <Pressable style={styles.fill} onPress={onBackdropPress}>
        {/* Stop propagation so taps inside the panel don't dismiss it. */}
        <Pressable style={styles.panelWrap} onPress={() => {}}>
          <Animated.View style={[styles.panel, panelStyle]}>
            {children}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.scrimModal,
  },
  fill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  panelWrap: {
    width: "82%",
    maxWidth: 360,
  },
  panel: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.panelBorder,
    alignItems: "center",
    gap: 16,
  },
});
