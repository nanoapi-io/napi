import { defineConfig, PluginOption, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react() as PluginOption],
    define: {
      "process.env": env,
    },
    server: {
      port: 3001,
    },
  };
});
