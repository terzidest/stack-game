import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { Phase } from "./src/game/types";
import GameCanvas from "./src/components/GameCanvas";
import HUD, { SUN_TOP_PAD, SUN_SIZE } from "./src/components/HUD";
import ScorePops, { type ScorePopItem } from "./src/components/ScorePops";
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
  const [lastBlocks, setLastBlocks] = useState(0);
  const [lastStreak, setLastStreak] = useState(0);
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const [scorePops, setScorePops] = useState<ScorePopItem[]>([]);
  const nextPopId = useRef(0);

  const { width: W } = useWindowDimensions();
  const sunCenter = { x: W / 2, y: SUN_TOP_PAD + SUN_SIZE / 2 };

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
  const handleScorePop = useCallback(
    (gain: number, x: number, y: number, perfect: boolean) => {
      const id = nextPopId.current++;
      setScorePops((pops) => [...pops, { id, gain, x, y, perfect }]);
    },
    []
  );
  const removePop = useCallback(
    (id: number) => setScorePops((pops) => pops.filter((p) => p.id !== id)),
    []
  );
  const handleGameOver = useCallback(
    (finalScore: number, finalBlocks: number, finalStreak: number) => {
      setPhase("over"); // batched with the stats below → no stale-stat flash
      const result = commitScore(finalScore);
      setBest(result.best);
      setNewRecord(result.isNewRecord);
      setLastBlocks(finalBlocks);
      setLastStreak(finalStreak);
    },
    []
  );

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
          onScorePop={handleScorePop}
          onGameOver={handleGameOver}
        />
        <HUD score={score} phase={phase} />
        <ScorePops items={scorePops} sun={sunCenter} onDone={removePop} />
        <Overlay
          phase={phase}
          score={score}
          blocks={lastBlocks}
          streak={lastStreak}
          best={best}
          newRecord={newRecord}
        />
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
            style={styles.pauseButton}
            hitSlop={12}
            onPress={handlePause}
          >
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
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
    backgroundColor: "#1d3f6e",
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
  pauseButton: {
    position: "absolute",
    top: 56,
    right: 22,
    width: 40,
    height: 40,
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  pauseBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: "#eaf2ff",
  },
});
