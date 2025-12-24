import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/register', (req, res) => {
  console.log('Registration request:', req.body);
  res.json({ message: 'Registration working', data: req.body });
});

app.listen(3002, () => {
  console.log('Quick test server running on port 3002');
});