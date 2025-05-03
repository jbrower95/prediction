import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === 'github';
  
  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
    },
    // Set base path for GitHub Pages, otherwise use root
    base: isGitHubPages ? '/prediction/' : '/',
  };
});
