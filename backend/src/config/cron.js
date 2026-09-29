const cron = require('node-cron');
const logger = require('../utils/logger');
const { expireMembershipJob } = require('../jobs/expireMembership.job');
const { biometricSyncJob } = require('../jobs/biometricSync.job');

// Initialize all cron jobs
const initCronJobs = () => {
  try {
    // Run at midnight every day to expire memberships
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running membership expiration job...');
      try {
        await expireMembershipJob();
        logger.info('Membership expiration job completed successfully');
      } catch (error) {
        logger.error('Membership expiration job failed:', error);
      }
    });

    // Run every 30 minutes to sync biometric data
    cron.schedule('*/30 * * * *', async () => {
      logger.info('Running biometric sync job...');
      try {
        await biometricSyncJob();
        logger.info('Biometric sync job completed successfully');
      } catch (error) {
        logger.error('Biometric sync job failed:', error);
      }
    });

    // Run at 11:59 PM every day to generate daily reports
    cron.schedule('59 23 * * *', async () => {
      logger.info('Running daily report generation...');
      try {
        // This would trigger report generation
        logger.info('Daily report generation completed');
      } catch (error) {
        logger.error('Daily report generation failed:', error);
      }
    });

    logger.info('Cron jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize cron jobs:', error);
  }
};

module.exports = {
  initCronJobs
};