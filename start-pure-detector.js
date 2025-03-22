// Start the pure port detector explicitly
import { exec } from 'child_process';

// Run in the background and log output
const detector = exec('node pure-port-detector.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing command: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(`stdout: ${stdout}`);
});

detector.stdout.on('data', (data) => {
  console.log(`Detector output: ${data}`);
});

detector.stderr.on('data', (data) => {
  console.error(`Detector error: ${data}`);
});

detector.on('close', (code) => {
  console.log(`Detector process exited with code ${code}`);
});

console.log('Started pure port detector in background...');