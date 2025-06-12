// backend/src/jobs/metrics.job.ts
import cron from 'node-cron';
import logger from '../utils/logger';

// Run every hour to collect metrics
const scheduleMetricsCollection = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Starting metrics collection job...');
      // TODO: Implement metrics collection logic
      logger.info('Metrics collection job completed');
    } catch (error) {
      logger.error('Error in metrics collection job:', error);
    }
  });
};

// Initialize the job when this module is imported
scheduleMetricsCollection();

export default scheduleMetricsCollection;