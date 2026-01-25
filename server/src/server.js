require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { initializeJobs, runInitialSetup } = require('./jobs/scheduler');

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const server = app.listen(PORT, async () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`🚀 Server ready at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📰 Articles API: http://localhost:${PORT}/api/articles`);

      // Run initial setup (categories, sources, initial fetch)
      await runInitialSetup();

      // Initialize scheduled jobs
      initializeJobs();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
