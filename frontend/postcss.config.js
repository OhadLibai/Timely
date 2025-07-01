// frontend/postcss.config.js
// PostCSS configuration for Parcel + Tailwind CSS
// This bridges the gap between .postcssrc and what Docker expects

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}

// ============================================================================
// CONFIGURATION NOTES:
// 
// ✅ Provides PostCSS configuration in CommonJS format
// ✅ Works with both Parcel and Docker environments  
// ✅ Enables Tailwind CSS processing
// ✅ Includes autoprefixer for browser compatibility
// ✅ Complementary to existing .postcssrc file
// 
// This file ensures PostCSS works consistently across:
// - Local development (Parcel respects both formats)
// - Docker containers (expects postcss.config.js)
// - Build processes (standard PostCSS configuration)
// ============================================================================