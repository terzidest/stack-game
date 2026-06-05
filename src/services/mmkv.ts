// Single shared MMKV instance for all persisted state (high score, settings).
// One wrapper over the default native store; imported by the storage/settings
// services rather than each creating its own.

import { createMMKV } from "react-native-mmkv";

export const store = createMMKV();
