import http from 'http';

const keepAlive = () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  });

  server.listen(3001, () => {
    console.log('Keep-alive server is running on port 3001');
  });
};

export default keepAlive;
