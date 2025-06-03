// backend/src/utils/logger.ts
import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, align, json } = winston.format;

// Determine log directory (optional, for file transport)
const logDir = path.join(__dirname, '../../logs'); // Adjust path if needed

const enumerateErrorFormat = winston.format(info => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    enumerateErrorFormat(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Log in JSON format for easier parsing by log management systems
  ),
  transports: [
    // Console transport with colorization for development
    new winston.transports.Console({
      stderrLevels: ['error'],
      format: combine(
        colorize({ all: true }),
        printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
      ),
    }),
    // Optional: File transport for errors
    // new winston.transports.File({
    //   filename: path.join(logDir, 'error.log'),
    //   level: 'error',
    // }),
    // Optional: File transport for all logs
    // new winston.transports.File({
    //   filename: path.join(logDir, 'combined.log'),
    // }),
  ],
  exceptionHandlers: [ // Handle uncaught exceptions
    new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            printf((info) => `[${info.timestamp}] UNCAUGHT EXCEPTION ${info.level}: ${info.message}`)
        )
    }),
    // new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ],
  rejectionHandlers: [ // Handle unhandled promise rejections
    new winston.transports.Console({
         format: combine(
            colorize({ all: true }),
            printf((info) => `[${info.timestamp}] UNHANDLED REJECTION ${info.level}: ${info.message}`)
        )
    }),
    // new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Example of how to use it in other files:
// import logger from './utils/logger';
// logger.info('This is an informational message.');
// logger.warn('This is a warning message.');
// logger.error('This is an error message.', { errorDetails: new Error('Something went wrong') });
// logger.debug('This is a debug message.');

export default logger;