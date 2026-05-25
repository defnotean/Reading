type Env = Record<string, string | undefined>;

export function createTauriServerConfig(env: Env = process.env) {
  const host = env.TAURI_DEV_HOST;

  return {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  };
}

export function createTauriBuildConfig(env: Env = process.env) {
  const isTauriDebug = !!env.TAURI_ENV_DEBUG;

  return {
    target: "es2021",
    minify: !isTauriDebug ? "esbuild" : false,
    sourcemap: isTauriDebug,
  };
}
