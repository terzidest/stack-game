import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import type { Phase } from "./src/game/types";
import GameCanvas from "./src/components/GameCanvas";
import HUD from "./src/components/HUD";
import Overlay from "./src/components/Overlay";
import { loadHighScore, commitScore } from "./src/services/storage";

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  // Read the persisted best once at startup.
  useEffect(() => setBest(loadHighScore()), []);

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

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <GameCanvas
          phase={phase}
          onPhaseChange={handlePhaseChange}
          onScoreChange={handleScoreChange}
          onComboChange={handleComboChange}
          onGameOver={handleGameOver}
        />
        <HUD score={score} combo={combo} phase={phase} />
        <Overlay phase={phase} score={score} best={best} newRecord={newRecord} />
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
});
