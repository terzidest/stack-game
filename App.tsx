import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { Phase } from "./src/game/types";
import GameCanvas from "./src/components/GameCanvas";
import HUD from "./src/components/HUD";
import Overlay from "./src/components/Overlay";
import Settings from "./src/components/Settings";
import PauseOverlay from "./src/components/PauseOverlay";
import { loadHighScore, commitScore } from "./src/services/storage";
import {
  loadSettings,
  setSound,
  setHaptics,
} from "./src/services/settings";

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);

  // Read the persisted best once at startup.
  useEffect(() => setBest(loadHighScore()), []);

  const handleToggleSound = useCallback((value: boolean) => {
    setSound(value);
    setSettings(loadSettings());
  }, []);
  const handleToggleHaptics = useCallback((value: boolean) => {
    setHaptics(value);
    setSettings(loadSettings());
  }, []);

  const handlePhaseChange = useCallback((p: Phase) => {
    setPhase(p);
    if (p === "playing") setNewRecord(false); // clear the badge on replay
  }, []);
  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleComboChange = useCallback((c: number) => setCombo(c), []);
  const handleGameOver = useCallback((finalScore: number) => {
    const result = commitScore(finalScore);
    setBest(result.best);
    setNewRecord(result.isNewRecord);
  }, []);

  const handlePause = useCallback(() => setPhase("paused"), []);
  const handleResume = useCallback(() => setPhase("playing"), []);
  const handleRestart = useCallback(() => {
    setRestartNonce((n) => n + 1); // tells GameCanvas to reset its world
    setScore(0);
    setCombo(0);
    setPhase("playing");
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <GameCanvas
          phase={phase}
          restartNonce={restartNonce}
          onPhaseChange={handlePhaseChange}
          onScoreChange={handleScoreChange}
          onComboChange={handleComboChange}
          onGameOver={handleGameOver}
        />
        <HUD score={score} combo={combo} phase={phase} />
        <Overlay phase={phase} score={score} best={best} newRecord={newRecord} />
        {(phase === "idle" || phase === "over") && (
          <Pressable
            style={styles.corner}
            hitSlop={12}
            onPress={() => setSettingsOpen(true)}
          >
            <Text style={styles.cornerIcon}>⚙</Text>
          </Pressable>
        )}
        {phase === "playing" && (
          <Pressable
            style={styles.corner}
            hitSlop={12}
            onPress={handlePause}
          >
            <Text style={styles.cornerIcon}>⏸</Text>
          </Pressable>
        )}
        <PauseOverlay
          open={phase === "paused"}
          score={score}
          onResume={handleResume}
          onRestart={handleRestart}
        />
        <Settings
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onToggleSound={handleToggleSound}
          onToggleHaptics={handleToggleHaptics}
        />
        <StatusBar style="light" hidden />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#0d0f14",
  },
  corner: {
    position: "absolute",
    top: 56,
    right: 22,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerIcon: {
    fontSize: 24,
    color: "#9aa3b8",
  },
});
