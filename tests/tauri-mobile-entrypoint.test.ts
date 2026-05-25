import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Tauri mobile entrypoint contract", () => {
  test("Cargo library keeps mobile-compatible crate types", () => {
    const cargo = read("src-tauri/Cargo.toml");

    expect(cargo).toContain("crate-type = [\"staticlib\", \"cdylib\", \"rlib\"]");
  });

  test("shared library exposes a mobile entrypoint runner", () => {
    const lib = read("src-tauri/src/lib.rs");

    expect(lib).toContain("#[cfg_attr(mobile, tauri::mobile_entry_point)]");
    expect(lib).toContain("pub fn run()");
    expect(lib).toContain("tauri::Builder::default()");
    expect(lib).not.toContain("tauri_plugin_opener::init()");
    expect(lib).toContain("commands::browse");
    expect(lib).toContain("commands::from_url");
  });

  test("default capabilities do not grant external opener permissions", () => {
    const capabilities = read("src-tauri/capabilities/default.json");

    expect(capabilities).not.toContain("opener:");
  });

  test("frontend package does not ship the external opener plugin", () => {
    const pkg = JSON.parse(read("package.json"));

    expect(pkg.dependencies).not.toHaveProperty("@tauri-apps/plugin-opener");
  });

  test("desktop binary delegates to the shared runner", () => {
    const main = read("src-tauri/src/main.rs");

    expect(main).toContain("reading_lib::run();");
    expect(main).not.toContain("tauri::Builder::default()");
  });

  test("public app identity uses the online owner name", () => {
    const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
    const cargo = read("src-tauri/Cargo.toml");
    const gradle = read("src-tauri/gen/android/app/build.gradle.kts");
    const activity = read(
      "src-tauri/gen/android/app/src/main/java/com/defnotean/reading/MainActivity.kt",
    );
    const androidBuildTask = read(
      "src-tauri/gen/android/buildSrc/src/main/java/com/defnotean/reading/kotlin/BuildTask.kt",
    );

    expect(tauri.identifier).toBe("com.defnotean.reading");
    expect(cargo).toContain('authors = ["defnotean"]');
    expect(gradle).toContain('namespace = "com.defnotean.reading"');
    expect(gradle).toContain('applicationId = "com.defnotean.reading"');
    expect(activity).toContain("package com.defnotean.reading");
    expect(androidBuildTask).toContain("open class BuildTask");
  });
});
