import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        phase: {
          brainstorm: "#F59E0B",
          research: "#3B82F6",
          architecture: "#8B5CF6",
          environment: "#10B981",
          tasks: "#EF4444",
          design: "#EC4899",
          coding: "#06B6D4",
        },
      },
    },
  },
} satisfies Config;
