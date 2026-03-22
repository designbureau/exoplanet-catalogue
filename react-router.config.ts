import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@react-router/vercel";

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
