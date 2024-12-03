const express = require('express');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();

// Create a transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // Use TLS, so secure is set to false
  auth: {
    user: "7fceb9001@smtp-brevo.com", // Replace with Brevo SMTP username
    pass: "rpfRcJAtxQYTEKLb" // Replace with Brevo SMTP password or API key
  }
});

// Enable CORS
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/OTPContract.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'contracts', 'OTPContract.json'));
});

app.get('/Authenticate.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'contracts', 'Authenticate.json'));
});

// OTP sending endpoint
app.post('/send-otp', async (req, res) => {
  const { email, otp } = req.body; // Use the OTP from the request body

  // Email message options
  const mailOptions = {
    from: 'nguyenthanhtunglop9a1ltv3214@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'OTP sent successfully', otp }); // OTP sent response
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).send({ error: 'Failed to send OTP' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});