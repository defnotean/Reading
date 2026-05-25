/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createTauriBuildConfig, createTauriServerConfig } from "./vite.tauri";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: createTauriServerConfig(),
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: createTauriBuildConfig(),
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
