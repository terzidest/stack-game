import { useAudioPlayer } from "expo-audio";

export function useGameSounds() {
  // Players are pre-loaded; play() is fire-and-forget.
  // Empty placeholder files are in assets/sfx/ — replace with real SFX.
  const dropPlayer = useAudioPlayer(require("../../assets/sfx/drop.mp3"));
  const perfectPlayer = useAudioPlayer(require("../../assets/sfx/perfect.mp3"));

  function playDrop(): void {
    try {
      dropPlayer.seekTo(0);
      dropPlayer.play();
    } catch {}
  }

  function playPerfect(): void {
    try {
      perfectPlayer.seekTo(0);
      perfectPlayer.play();
    } catch {}
  }

  return { playDrop, playPerfect };
}
