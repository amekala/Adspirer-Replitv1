import { createServer, request } from 'http';

// Create a simple HTTP server
const server = createServer((req, res) => {
  console.log(`Received request for ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Port detector is working!');
});

// The port Replit expects for workflow detection
const PORT = 5000;

// Listen on 0.0.0.0 (all interfaces) to make it accessible
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Send health check ping every 2 seconds
  setInterval(() => {
    // Create a request to our own server to show activity
    const req = request({
      host: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Health check ping: ${res.statusCode}`);
      });
    });
    
    req.on('error', (e) => {
      console.error(`Health check error: ${e.message}`);
    });
    
    req.end();
  }, 2000);
});