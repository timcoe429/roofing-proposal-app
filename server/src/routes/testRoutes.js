import express from 'express';
import { google } from 'googleapis';
import logger from '../utils/logger.js';

const router = express.Router();

// Test Google Sheets API key
router.get('/test-google-sheets-api', async (req, res) => {
  try {
    logger.info('🧪 Testing Google Sheets API key...');
    
    // Check if API key exists
    if (!process.env.GOOGLE_SHEETS_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'GOOGLE_SHEETS_API_KEY not found in environment variables',
        details: 'The API key is not configured in Railway environment'
      });
    }

    logger.info('✅ API key found in environment');
    
    // Initialize Google Sheets API
    const sheets = google.sheets('v4');
    
    // Test with a simple public spreadsheet (Google's own test sheet)
    const testSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google's sample sheet
    
    logger.info(`🔍 Testing API call with test spreadsheet: ${testSpreadsheetId}`);
    
    // For public Google Sheets, use 'key' parameter with API key
    const response = await sheets.spreadsheets.values.get({
      key: process.env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: testSpreadsheetId,
      range: 'Class Data!A2:E', // Known range in the test sheet
    });

    logger.info('📊 API call successful!');
    logger.info('Response status:', response.status);
    logger.info('Data rows found:', response.data.values?.length || 0);

    res.json({
      success: true,
      message: 'Google Sheets API key is working correctly!',
      testResults: {
        apiKeyConfigured: true,
        apiCallSuccessful: true,
        testSpreadsheetId: testSpreadsheetId,
        rowsReturned: response.data.values?.length || 0,
        sampleData: response.data.values?.slice(0, 3) || [] // First 3 rows
      }
    });

  } catch (error) {
    logger.error('❌ Google Sheets API test failed:', error);
    
    let errorDetails = {
      message: error.message,
      code: error.code,
      status: error.status
    };

    // Provide specific error guidance
    let guidance = [];
    
    if (error.code === 403) {
      guidance.push('API key may not have Google Sheets API enabled');
      guidance.push('Check Google Cloud Console > APIs & Services > Enabled APIs');
      guidance.push('Ensure Google Sheets API is enabled for your project');
    } else if (error.code === 400) {
      guidance.push('API key format may be invalid');
      guidance.push('Verify the API key was copied correctly');
    } else if (error.code === 401) {
      guidance.push('API key is not authorized');
      guidance.push('Check API key restrictions in Google Cloud Console');
    }

    res.status(500).json({
      success: false,
      error: 'Google Sheets API test failed',
      details: errorDetails,
      guidance: guidance
    });
  }
});

// Test your specific spreadsheet
router.post('/test-your-spreadsheet', async (req, res) => {
  try {
    const { spreadsheetUrl } = req.body;
    
    if (!spreadsheetUrl) {
      return res.status(400).json({
        success: false,
        error: 'spreadsheetUrl is required'
      });
    }

    logger.info('🧪 Testing your specific spreadsheet...');
    
    // Extract spreadsheet ID
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google Sheets URL format'
      });
    }

    const spreadsheetId = match[1];
    logger.info(`📊 Testing spreadsheet ID: ${spreadsheetId}`);

    const sheets = google.sheets('v4');
    
    // For public Google Sheets, use 'key' parameter with API key
    const response = await sheets.spreadsheets.values.get({
      key: process.env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: spreadsheetId,
      range: 'A:Z', // Get all data
    });

    logger.info('✅ Your spreadsheet test successful!');
    logger.info('Rows found:', response.data.values?.length || 0);

    res.json({
      success: true,
      message: 'Your spreadsheet is accessible!',
      results: {
        spreadsheetId: spreadsheetId,
        totalRows: response.data.values?.length || 0,
        dataRows: (response.data.values?.length || 1) - 1, // Excluding header
        firstRow: response.data.values?.[0] || [],
        sampleData: response.data.values?.slice(0, 5) || []
      }
    });

  } catch (error) {
    logger.error('❌ Your spreadsheet test failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to access your spreadsheet',
      details: {
        message: error.message,
        code: error.code,
        status: error.status
      }
    });
  }
});

export default router;
