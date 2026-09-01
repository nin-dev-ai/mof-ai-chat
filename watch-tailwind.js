const chokidar = require('chokidar');
const { exec } = require('child_process');

// Watch the input.css file and tailwind config
const watcher = chokidar.watch([
  'src/styles/input.css',
  'tailwind.config.js'
]);

// Run the build script when files change
watcher.on('change', (path) => {
  console.log(`File ${path} changed. Rebuilding Tailwind CSS...`);
  exec('node build-tailwind.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}); 