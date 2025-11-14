import path from "path"
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import i18nextLoader from 'vite-plugin-i18next-loader'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH ?? "/",
    server: {
      port: 5175,
    },
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
    // https://github.com/mui/material-ui/issues/32727#issuecomment-1697253782
    optimizeDeps: {
      include: ['@mui/material/Tooltip', '@emotion/styled', '@mui/material/Unstable_Grid2'],
    },
  };
})
