import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'

// Explicitly register PostCSS plugins so Tailwind directives (@tailwind base/components/utilities)
// are resolved during CSS compilation.
export default {
  plugins: [tailwindcss, autoprefixer]
}
