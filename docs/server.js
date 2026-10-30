const express = require('express');
const app = express();

app.use(express.json());   // must come BEFORE the routes

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;

  // Demo check — replace with your real user lookup
  if (phone === '9876543210' && password === 'farmer123') {
    return res.json({
      token: 'demo-token-123',
      user: { name: 'Demo Farmer', phone }
    });
  }
  res.status(401).json({ error: 'Invalid mobile number or password' });
});

app.use(express.static('public'));   // keep static files AFTER the API routes
app.listen(3000, () => console.log('Running on http://localhost:3000'));
