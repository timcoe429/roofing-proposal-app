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
    if (!process.env.GOOGLE_SHEETS_API_KEY) {
      throw new Error('GOOGLE_SHEETS_API_KEY not configured');
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL format');
    }

    logger.info(`Fetching data from Google Sheet: ${spreadsheetId}`);

    // Fetch all data from the first sheet
    const response = await sheets.spreadsheets.values.get({
      auth: process.env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: spreadsheetId,
      range: 'A:Z', // Get all columns
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the Google Sheet');
    }

    logger.info(`Successfully fetched ${rows.length} rows from Google Sheet`);

    // Convert to CSV format for Claude AI processing
    const csvData = rows.map(row => 
      row.map(cell => 
        // Escape cells that contain commas or quotes
        cell && (cell.includes(',') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell || ''
      ).join(',')
    ).join('\n');

    return {
      rows: rows,
      csvData: csvData,
      rowCount: rows.length,
      dataRowCount: rows.length - 1 // Excluding header
    };

  } catch (error) {
    logger.error('Error fetching Google Sheets data:', error);
    
    // Provide helpful error messages
    if (error.code === 403) {
      throw new Error('Google Sheets API access denied. Please ensure the sheet is publicly viewable.');
    } else if (error.code === 404) {
      throw new Error('Google Sheet not found. Please check the URL and ensure the sheet exists.');
    } else {
      throw new Error(`Failed to fetch Google Sheet data: ${error.message}`);
    }
  }
}

export default {
  fetchGoogleSheetData
};
