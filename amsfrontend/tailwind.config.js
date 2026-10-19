/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#69BE28',    // Primary green
          deep: '#287A3E',       // Deep green
          light: '#EAF7E4',      // Light green
          'very-light': '#F5FBF1', // Very light green
          dark: '#1A4D27',       // Dark green accent
        },
        ams: {
          bg: '#F7F9F6',         // Main background
          card: '#FFFFFF',       // Card background
          text: '#233128',       // Primary text
          muted: '#6B776D',      // Secondary text
          border: '#E1E9DF',     // Neutral border
          error: '#C62828',      // Error
          warning: '#A96800',    // Warning
          success: '#287A3E',    // Success
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(40, 122, 62, 0.05), 0 1px 2px 0 rgba(40, 122, 62, 0.03)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 8px 0 rgba(40, 122, 62, 0.04)',
        'modal': '0 10px 25px -5px rgba(35, 49, 40, 0.12), 0 8px 10px -6px rgba(35, 49, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
