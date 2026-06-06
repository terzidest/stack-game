import { useEffect } from "react";
import { useAudioPlayer } from "expo-audio";

export function useGameSounds() {
  // Players are pre-loaded; play() is fire-and-forget.
  // Empty placeholder files are in assets/sfx/ — replace with real SFX.
  const dropPlayer = useAudioPlayer(require("../../assets/sfx/drop.mp3"));
  const perfectPlayer = useAudioPlayer(require("../../assets/sfx/perfect.mp3"));

  // Warm up the audio pipeline at mount. The very first play of a sound is
  // otherwise delayed while the OS activates the audio session and primes the
  // decoder — which reads as lag on the first few drops. Priming each player
  // muted spins all that up ahead of time; we then reset position and unmute.
  useEffect(() => {
    const players = [dropPlayer, perfectPlayer];
    for (const p of players) {
      try {
        p.muted = true;
        p.play();
      } catch {}
    }
    const t = setTimeout(() => {
      for (const p of players) {
        try {
          p.pause();
          p.seekTo(0);
          p.muted = false;
        } catch {}
      }
    }, 250);
    return () => clearTimeout(t);
  }, [dropPlayer, perfectPlayer]);

  // seekTo() is async; after a sound has played once the player sits at its end,
  // so play() must wait for the rewind to land or it fires on an ended player
  // and is silently dropped (the intermittent "no sound" bug). Chain play() off
  // the resolved seek so a trigger is reliable.
  function playDrop(): void {
    try {
      dropPlayer.seekTo(0).then(() => dropPlayer.play()).catch(() => {});
    } catch {}
  }

  function playPerfect(): void {
    try {
      perfectPlayer.seekTo(0).then(() => perfectPlayer.play()).catch(() => {});
    } catch {}
  }

  return { playDrop, playPerfect };
}
