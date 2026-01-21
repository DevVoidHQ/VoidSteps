/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@devvoid/ui/**/*.{js,mjs}",
  ],
  presets: [require("@devvoid/ui/tailwind.preset")],
};
