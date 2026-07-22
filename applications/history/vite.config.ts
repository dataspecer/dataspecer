import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import i18nextLoader from 'vite-plugin-i18next-loader'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 5177,
    },
    base: env.VITE_BASE_PATH ?? "/",
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
  };
});
