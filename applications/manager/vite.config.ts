import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import i18nextLoader from 'vite-plugin-i18next-loader'

export default defineConfig({
  server: {
    port: 5174,
  },
  base: "",
  plugins: [
    react(),
    tailwindcss(),
    i18nextLoader({
      paths: ['./locales'],
      namespaceResolution: 'basename'
    })
  ],
  build: {
    commonjsOptions: {
      include: [/packages\//, /node_modules/],
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "fs": "path", // Hack to make polyfill to null
    },
  },
})