import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/ui/": path.resolve(__dirname, "../../packages/ui/src/"),
      "@workspace/schemas/": path.resolve(
        __dirname,
        "../../packages/schemas/src/"
      ),
      "@workspace/db": path.resolve(__dirname, "../../packages/db/src"),
      "@workspace/auth": path.resolve(__dirname, "../../packages/auth/src"),
      "@workspace/email": path.resolve(__dirname, "../../packages/email/src"),
      "@workspace/files": path.resolve(__dirname, "../../packages/files/src"),
    },
  },
})
