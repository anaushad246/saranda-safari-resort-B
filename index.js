import dotenv from 'dotenv';

// 1. Load environment variables immediately
dotenv.config({ path: './.env' });

// 2. Dynamically import DB connection and app after dotenv configuration
const connectDB = (await import('./src/db/index.js')).default;
const { app } = await import('./src/app.js');

const PORT = process.env.PORT || 5000;

// 3. Connect to MongoDB, then launch HTTP server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[Saranda Safari Resort Server] Running on http://localhost:${PORT}`);
      console.log(`[Health Check] http://localhost:${PORT}/api/v1/health`);
    });

    app.on('error', (error) => {
      console.error('EXPRESS APP ERROR:', error);
      throw error;
    });
  })
  .catch((err) => {
    console.error('MONGO DB connection failed:', err);
  });
