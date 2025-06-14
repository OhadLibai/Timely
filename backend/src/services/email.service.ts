// timely/backend/src/services/email.service.ts
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

// This is a mock email service that logs to the console for development.
// For production, we would integrate a real email provider (e.g., using nodemailer with SendGrid, Mailgun, etc.).
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  logger.info('--- Mock Email Service ---');
  logger.info(`Sending email to: ${options.to}`);
  logger.info(`Subject: ${options.subject}`);
  logger.info('Body (HTML):');
  logger.info(options.html);
  logger.info('--- End Mock Email Service ---');

  // In a real implementation:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from: 'no-reply@timely.com', ...options });

  return Promise.resolve();
};