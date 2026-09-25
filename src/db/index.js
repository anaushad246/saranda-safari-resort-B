import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const connectionUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const connectionInstance = await mongoose.connect(connectionUri, {
      dbName: DB_NAME
    });
    console.log(`\n[MongoDB Connected]: DB HOST: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error('[MongoDB Connection FAILED]:', error.message);
    throw error; // Rethrow so caller knows database connection failed!
  }
};

export default connectDB;
