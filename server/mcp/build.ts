import { copyFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    // Create dist directory
    await mkdir(join(__dirname, 'dist'), { recursive: true });
    
    // Copy configuration file
    await copyFile(
      join(__dirname, 'claude-config.json'),
      join(__dirname, 'dist', 'claude-config.json')
    );
    
    // Copy package.json
    await copyFile(
      join(__dirname, 'package.json'),
      join(__dirname, 'dist', 'package.json')
    );
    
    // Copy README
    await copyFile(
      join(__dirname, 'README.md'),
      join(__dirname, 'dist', 'README.md')
    );
    
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
