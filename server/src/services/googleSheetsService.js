import { google } from 'googleapis';
import logger from '../utils/logger.js';

// Initialize Google Sheets API
const sheets = google.sheets('v4');

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch data from Google Sheets using the API
 */
export async function fetchGoogleSheetData(sheetUrl) {
  try {
    logger.info('🔑 Checking Google Sheets API configuration...');
    
    if (!process.env.GOOGLE_SHEETS_API_KEY) {
      logger.error('❌ GOOGLE_SHEETS_API_KEY not found in environment');
      throw new Error('GOOGLE_SHEETS_API_KEY not configured');
    }
    
    logger.info('✅ GOOGLE_SHEETS_API_KEY found');

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      logger.error('❌ Could not extract spreadsheet ID from URL:', sheetUrl);
      throw new Error('Invalid Google Sheets URL format');
    }

    logger.info(`📊 Fetching data from Google Sheet ID: ${spreadsheetId}`);
    logger.info(`🔗 Original URL: ${sheetUrl}`);

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const requestWithRetry = async (attempts = 3) => {
      let lastError;
      for (let i = 1; i <= attempts; i++) {
        try {
          // Fetch all data from the first sheet
          // For public Google Sheets, use 'key' parameter with API key
          // The 'auth' parameter is for OAuth2 clients, not API keys
          return await sheets.spreadsheets.values.get({
            key: process.env.GOOGLE_SHEETS_API_KEY,
            spreadsheetId: spreadsheetId,
            range: 'A:Z', // Get all columns
          });
        } catch (err) {
          lastError = err;
          const code = err?.code || err?.response?.status;

          // Don't retry permanent errors
          if (code === 400 || code === 403 || code === 404) {
            throw err;
          }

          // Retry transient errors (429 / 5xx / network-ish)
          const delay = 400 * (2 ** (i - 1)) + Math.floor(Math.random() * 150);
          logger.warn(`⚠️ Google Sheets fetch attempt ${i} failed (code: ${code || 'unknown'}). Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
      throw lastError;
    };

    const response = await requestWithRetry(3);

    logger.info('📡 Google Sheets API response received');
    logger.info('Response status:', response.status);
    logger.info('Response data keys:', Object.keys(response.data || {}));

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      logger.error('❌ No data found in Google Sheet response');
      throw new Error('No data found in the Google Sheet');
    }

    logger.info(`✅ Successfully fetched ${rows.length} rows from Google Sheet`);
    logger.info('First row preview:', rows[0]?.slice(0, 5)); // Show first 5 columns of header

    // Convert to CSV format for Claude AI processing
    const csvData = rows.map(row => 
      row.map(cell => 
        // Escape cells that contain commas or quotes
        cell && (cell.includes(',') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell || ''
      ).join(',')
    ).join('\n');

    logger.info('📄 CSV conversion completed');
    logger.info('CSV preview (first 200 chars):', csvData.substring(0, 200));

    return {
      rows: rows,
      csvData: csvData,
      rowCount: rows.length,
      dataRowCount: rows.length - 1 // Excluding header
    };

  } catch (error) {
    logger.error('💥 Error fetching Google Sheets data:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack?.split('\n')[0] // Just first line of stack
    });
    
    // Provide helpful error messages
    if (error.code === 403) {
      throw new Error('Google Sheets API access denied. Please ensure the sheet is publicly viewable and the API key has proper permissions.');
    } else if (error.code === 404) {
      throw new Error('Google Sheet not found. Please check the URL and ensure the sheet exists.');
    } else if (error.code === 400) {
      throw new Error('Bad request to Google Sheets API. Please check the spreadsheet URL format.');
    } else {
      throw new Error(`Failed to fetch Google Sheet data: ${error.message}`);
    }
  }
}

export default {
  fetchGoogleSheetData
};
