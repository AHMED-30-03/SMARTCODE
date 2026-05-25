/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EEF7FD",
          100: "#D6EEFA",
          200: "#ADDEF5",
          300: "#84CDEF",
          400: "#5BB8E8",
          500: "#3AA8E0",
          600: "#2090C8",
          700: "#1870A0",
          800: "#105078",
          900: "#083050",
        },
      },
    },
  },
  plugins: [],
};
