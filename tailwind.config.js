/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. Configure all paths where you will use Tailwind classes.
  presets: [require("nativewind/preset")],
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
  ],
  
  theme: {
    // 2. Define your screen breakpoints for responsive design.
    screens: {
    'xs': '375px',   // Small mobile phones (e.g., iPhone SE)
    'sm': '430px',   // Large mobile phones (e.g., iPhone 14/15 Pro Max)
    'md': '768px',   // Tablets in portrait mode
    'lg': '1024px',  // Tablets in landscape and small laptops
    'xl': '1280px',  // Laptops and desktops
  },
    
    // 3. Extend the default theme with your custom design system.
    extend: {
      // 3.1: Colors using a flat, semantic naming convention.
      colors: {
        // --- Core Brand Colors ---
        'primary-color':'#121212',
        'secondary-color':'#1B1B1B',
        'brand-navy': '#272343',
        'brand-navy-light': '#2d334a',
        'brand-yellow': '#F7CE45',
        'brand-yellow-light': '#fbdd74',
        'brand-green': '#e3f6f5',

        // --- UI & State Colors ---
        'ui-live-red': '#e74c3c',
        'ui-stream-blue': '#3498db',
        'ui-success': '#22C55E',
        'ui-warning': '#FF8C00',

        // --- Neutral, Background & Text Colors ---
        'text-primary': 'rgba(250, 250, 250, 0.9)',
        'text-secondary': 'rgba(250, 250, 250, 0.62)',
        'text-tertiary': 'rgba(250, 250, 250, 0.42)',
        'bg-dark': '#16171B',
        'bg-light': '#F5F5F5',
        'bg-black-light': 'rgba(30, 30, 30, 1)',
        'bg-grey-dark': '#2a2a2a',

        // --- Gradient Color Stops (for use with gradient libraries) ---
        'grad-brand-start': '#a78bfa',
        'grad-brand-end': '#c026d3',
        'grad-fire-start': 'rgba(126, 14, 2, 0.29)',
        'grad-fire-end': 'rgba(253, 209, 34, 0.29)',
      },
      
      // 3.2: Fonts - Placeholders for your custom fonts.
      fontFamily: {
        'sans': ['System'], // Default system font
        'display': ['YourDisplayFont-Bold'], // For headings
        'body': ['YourBodyFont-Regular'],   // For body text
      },
      
      // 3.3: Spacing - Stick to the default scale or add specific values.
      spacing: {
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
      },
      
      // 3.4: Border Radius - Prefixed with 'app-' for clarity.
      borderRadius: {
        'app-sm': '4px',
        'app-md': '8px',
        'app-lg': '12px',
        'app-xl': '16px',
        'app-full': '9999px',
      },

      // 3.5: Z-Index - A simple, semantic scale.
      zIndex: {
        '10': '10', // For floating elements
        '20': '20', // For headers/navbars
        '30': '30', // For dropdowns/popovers
        '40': '40', // For overlays
        '50': '50', // For modals
      },
    },
  },
  
  // 4. Add any essential plugins.
  plugins: [],
};