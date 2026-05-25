import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

type Capability = {
  permissions: string[];
};

test("desktop capability grants the custom window chrome commands", () => {
  const capability = JSON.parse(
    readFileSync(resolve(process.cwd(), "src-tauri/capabilities/default.json"), "utf8"),
  ) as Capability;

  expect(capability.permissions).toEqual(
    expect.arrayContaining([
      "core:window:allow-close",
      "core:window:allow-minimize",
      "core:window:allow-start-dragging",
      "core:window:allow-toggle-maximize",
    ]),
  );
});
