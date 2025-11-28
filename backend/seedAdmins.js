const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password123@mongodb:27017/elearning?authSource=admin';

mongoose.connect(mongoUri).then(async () => {
  await Admin.deleteMany({}); // optional, to clear old data

  const admins = [
    { name: 'admin1', email: 'admin1@gmail.com', password: await bcrypt.hash('admin1', 10) },
    { name: 'jose', email: 'jose.p@vistaes.com', password: await bcrypt.hash('jose123', 10) },
    { name: 'mahaa', email: 'mahaashrichandran@gmail.com', password: await bcrypt.hash('mahaa1234', 10) },
  ];

  await Admin.insertMany(admins);
  console.log('✅ Admins seeded with hashed passwords');
  mongoose.disconnect();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
