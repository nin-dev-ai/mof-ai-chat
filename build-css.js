import fs from 'fs';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Read the input CSS file
const css = fs.readFileSync('src/styles/input.css', 'utf8');

// Process the CSS with Tailwind and autoprefixer
postcss([
  tailwindcss,
  autoprefixer,
])
  .process(css, {
    from: 'src/styles/input.css',
    to: 'dist2/styles.css',
  })
  .then((result) => {
    fs.writeFileSync('dist2/styles.css', result.css);
    console.log('CSS built successfully!');
  })
  .catch((error) => {
    console.error('Error building CSS:', error);
  }); 