import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
  try {
    const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const connectionUri = baseUri.includes(DB_NAME) 
      ? baseUri 
      : (baseUri.endsWith('/') ? `${baseUri}${DB_NAME}` : `${baseUri}/${DB_NAME}`);

    const connectionInstance = await mongoose.connect(connectionUri);
    console.log(`\n[MongoDB Connected]: DB HOST: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error('[MongoDB Connection FAILED]:', error.message);
    return null;
  }
};

export default connectDB;
