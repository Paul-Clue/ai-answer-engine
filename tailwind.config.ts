import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'text-pulse': 'textPulse 2s ease-in-out infinite',
      },
      keyframes: {
        textPulse: {
          '0%, 100%': { 
            color: '#ffffff',
            transform: 'scale(1)',
          },
          '50%': { 
            color: '#16A34A', // cyan-400
            transform: 'scale(1.1)',
          },
        },
      },
    },
  },
  
  plugins: [],
} satisfies Config;
