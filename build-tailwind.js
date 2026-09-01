const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Read the input CSS file
const inputCSS = fs.readFileSync('src/styles/input.css', 'utf8');

// Process the CSS with Tailwind and autoprefixer
postcss([
  tailwindcss('./tailwind.config.js'),
  autoprefixer,
])
  .process(inputCSS, {
    from: 'src/styles/input.css',
    to: 'src/styles/tailwind.css',
    map: { inline: false },
  })
  .then((result) => {
    // Write the processed CSS
    fs.writeFileSync('src/styles/tailwind.css', result.css);
    if (result.map) {
      fs.writeFileSync('src/styles/tailwind.css.map', result.map.toString());
    }
    console.log('Tailwind CSS built successfully!');
  })
  .catch((error) => {
    console.error('Error building Tailwind CSS:', error);
  }); 