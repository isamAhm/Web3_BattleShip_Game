/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
        body: ['var(--font-figtree)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
