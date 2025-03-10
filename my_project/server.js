const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Default XAMPP username
  password: '', // Default XAMPP password
  database: 'utamaduni_db'
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

// API to save booking data
app.post('/api/bookings', (req, res) => {
  const { guestName, guestEmail, guestPhone, package, adults, kids, totalPrice, startDate, endDate, paymentMethod } = req.body;
  const sql = `INSERT INTO bookings (guest_name, guest_email, guest_phone, package, adults, kids, total_price, start_date, end_date, payment_method) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [guestName, guestEmail, guestPhone, package, adults, kids, totalPrice, startDate, endDate, paymentMethod], (err, result) => {
    if (err) throw err;
    res.send('Booking saved successfully!');
  });
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});