// Updated server.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/detect-fraud', (req, res) => {
  console.log("detect-fraud endpoint hit with body:", req.body);
  res.json({ fraud: false });
});
app.get('/OTPContract.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'contracts', 'OTPContract.json'));
});

app.get('/Authenticate.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'contracts', 'Authenticate.json'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});