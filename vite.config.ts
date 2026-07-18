import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    // Pre-bundle at startup so the dev server doesn't re-optimize mid-session
    // (lazy re-optimization reloads can strand pages on mixed dep-chunk
    // generations — two copies of React and an invalid-hook crash).
    include: ["react-markdown", "remark-gfm", "three", "@react-three/fiber"],
  },
});
