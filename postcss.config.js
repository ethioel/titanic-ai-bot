module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {
      flexbox: true,
      grid: true,
      overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead']
    },
    '@tailwindcss/postcss': {
      extend: {
        colors: {
          // Custom colors from tailwind config
        }
      }
    }
  }
};