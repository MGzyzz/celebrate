import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const allowedHosts = env.VITE_ALLOWED_HOSTS?.split(",").map((host) => host.trim()).filter(Boolean) ?? [];
    const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    return {
        plugins: [react()],
        define: {
            __APP_VERSION__: JSON.stringify(packageJson.version ?? "0.0.0")
        },
        server: {
            host: "0.0.0.0",
            port: 5173,
            allowedHosts,
            proxy: {
                "/api": {
                    target: env.VITE_BACKEND_ORIGIN ?? "http://127.0.0.1:8000",
                    changeOrigin: true
                }
            }
        }
    };
});
