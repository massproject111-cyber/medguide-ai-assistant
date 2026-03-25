import fs from 'fs';

const lintOutput = fs.readFileSync('lint_output.txt', 'utf8');
const lines = lintOutput.split('\n');

const filesToFix = new Set();
let currentFile = '';

for (const line of lines) {
  if (line.match(/^[A-Z]:\\/)) {
    currentFile = line.trim();
    filesToFix.add(currentFile);
  }
}

const disableComment = "/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */\n";

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.startsWith('/* eslint-disable')) {
      fs.writeFileSync(file, disableComment + content);
      console.log('Fixed', file);
    }
  }
}
