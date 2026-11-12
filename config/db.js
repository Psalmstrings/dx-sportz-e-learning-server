const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dx_elearning_academy';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[E-Learning DB] Connected to MongoDB Atlas: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[E-Learning DB] Error connecting to MongoDB: ${error.message}`);
    // Fallback to local or retry
    try {
      console.log('[E-Learning DB] Attempting fallback to local MongoDB...');
      const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/dx_elearning_academy', {
        serverSelectionTimeoutMS: 3000
      });
      console.log(`[E-Learning DB] Connected to fallback local MongoDB: ${fallbackConn.connection.host}`);
      return fallbackConn;
    } catch (fallbackError) {
      console.warn(`[E-Learning DB] Warning: Could not connect to fallback DB (${fallbackError.message}). Operating with existing connection listeners.`);
    }
  }
};

module.exports = connectDB;
