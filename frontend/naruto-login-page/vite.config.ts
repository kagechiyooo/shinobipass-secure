import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const httpsKeyPath = env.HTTPS_KEY_FILE;
  const httpsCertPath = env.HTTPS_CERT_FILE;
  const hasHttpsFiles = Boolean(
    httpsKeyPath &&
    httpsCertPath &&
    fs.existsSync(httpsKeyPath) &&
    fs.existsSync(httpsCertPath),
  );

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify. File watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      https: hasHttpsFiles
        ? {
            key: fs.readFileSync(httpsKeyPath!),
            cert: fs.readFileSync(httpsCertPath!),
          }
        : undefined,
    },
  };
});
