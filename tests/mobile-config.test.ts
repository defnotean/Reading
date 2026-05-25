import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { createTauriBuildConfig, createTauriServerConfig } from "../vite.tauri";

type PackageJson = {
  scripts: Record<string, string>;
};

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("package scripts include Tauri Android commands", () => {
  const packageJson = JSON.parse(readProjectFile("package.json")) as PackageJson;

  expect(packageJson.scripts).toMatchObject({
    "android:init": "tauri android init --ci",
    "android:dev": "tauri android dev",
    "android:build": "tauri android build --ci",
  });
});

test("Vite config exposes Tauri mobile dev server settings", () => {
  const viteConfig = readProjectFile("vite.config.ts");
  const tauriViteConfig = readProjectFile("vite.tauri.ts");

  expect(viteConfig).toContain("server: createTauriServerConfig()");
  expect(viteConfig).toContain("build: createTauriBuildConfig()");
  expect(viteConfig).toContain('envPrefix: ["VITE_", "TAURI_ENV_"]');
  expect(tauriViteConfig).toContain("process.env");
  expect(tauriViteConfig).toContain("TAURI_DEV_HOST");
  expect(tauriViteConfig).toContain("TAURI_ENV_DEBUG");
});

test("Vite config maps TAURI_DEV_HOST into server host and HMR settings", () => {
  const server = createTauriServerConfig({ TAURI_DEV_HOST: "192.168.1.50" });
  const build = createTauriBuildConfig({ TAURI_ENV_DEBUG: "1" });

  expect(server).toMatchObject({
    port: 1420,
    strictPort: true,
    host: "192.168.1.50",
    hmr: {
      protocol: "ws",
      host: "192.168.1.50",
      port: 1421,
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  });
  expect(build).toMatchObject({ minify: false, sourcemap: true });
});

test("Vite config keeps desktop dev server local when TAURI_DEV_HOST is absent", () => {
  const server = createTauriServerConfig({});
  const build = createTauriBuildConfig({});

  expect(server).toMatchObject({
    port: 1420,
    strictPort: true,
    host: false,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  });
  expect(server.hmr).toBeUndefined();
  expect(build).toMatchObject({ minify: "esbuild", sourcemap: false });
});

test.each(["docs/ANDROID.md", "docs/LINUX.md", "docs/IOS.md"])(
  "%s exists",
  (docPath) => {
    expect(existsSync(resolve(process.cwd(), docPath))).toBe(true);
  },
);
