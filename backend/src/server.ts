import app from './app.js';
import env from './config/env.js';
import { testConnection } from './config/db.js';

async function startServer() {
  try {
    await testConnection();

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`Car Care API running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(
      'Database connection failed. Please check MySQL and .env configuration.',
      error
    );
    process.exit(1);
  }
}

startServer();