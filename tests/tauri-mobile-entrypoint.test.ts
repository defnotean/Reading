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
    expect(lib).toContain("tauri_plugin_opener::init()");
    expect(lib).toContain("commands::browse");
    expect(lib).toContain("commands::from_url");
  });

  test("desktop binary delegates to the shared runner", () => {
    const main = read("src-tauri/src/main.rs");

    expect(main).toContain("reading_lib::run();");
    expect(main).not.toContain("tauri::Builder::default()");
  });
});
