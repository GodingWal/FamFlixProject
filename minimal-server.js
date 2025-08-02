import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Minimal server working!');
});

const port = 5000;

try {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Minimal server listening on port ${port}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
}