// backend/src/utils/csv.utils.ts
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import logger from './logger';

// Parse CSV file
export const parseCSV = async <T = any>(filePath: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    
    if (!fs.existsSync(filePath)) {
      reject(new Error(`CSV file not found: ${filePath}`));
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', () => {
        logger.info(`CSV parsing completed. Parsed ${results.length} rows from ${filePath}`);
        resolve(results);
      })
      .on('error', (error: any) => {
        logger.error(`Error parsing CSV file ${filePath}:`, error);
        reject(error);
      });
  });
};

// Generate CSV from data
export const generateCSV = async <T = any>(
  data: T[], 
  fields: string[], 
  outputPath?: string
): Promise<string> => {
  try {
    const json2csvParser = new Parser({ fields });
    const csvContent = json2csvParser.parse(data);

    if (outputPath) {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      
      // Write to file
      fs.writeFileSync(outputPath, csvContent);
      logger.info(`CSV file generated successfully: ${outputPath}`);
      return outputPath;
    }

    return csvContent;
  } catch (error) {
    logger.error('Error generating CSV:', error);
    throw error;
  }
};

// Validate CSV headers
export const validateCSVHeaders = (filePath: string, expectedHeaders: string[]): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`CSV file not found: ${filePath}`));
      return;
    }

    const stream = fs.createReadStream(filePath);
    let headerChecked = false;

    stream
      .pipe(csv())
      .on('headers', (headers: any) => {
        headerChecked = true;
        const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
        
        if (missingHeaders.length > 0) {
          logger.warn(`Missing headers in CSV: ${missingHeaders.join(', ')}`);
          resolve(false);
        } else {
          logger.info('CSV headers validation passed');
          resolve(true);
        }
        
        stream.destroy(); // Stop reading after header check
      })
      .on('error', (error: any) => {
        logger.error(`Error validating CSV headers:`, error);
        reject(error);
      });
  });
};