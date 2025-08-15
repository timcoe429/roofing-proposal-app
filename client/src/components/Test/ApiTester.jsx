import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, TestTube } from 'lucide-react';
import api from '../../services/api';

export default function ApiTester() {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [yourSheetUrl, setYourSheetUrl] = useState('');
  const [yourSheetResults, setYourSheetResults] = useState(null);
  const [testingYourSheet, setTestingYourSheet] = useState(false);

  const testGoogleSheetsApi = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      const response = await fetch('/api/test/test-google-sheets-api');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setTestResults({
        success: false,
        error: 'Failed to connect to test endpoint',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testYourSpreadsheet = async () => {
    if (!yourSheetUrl.trim()) {
      alert('Please enter your Google Sheets URL');
      return;
    }

    setTestingYourSheet(true);
    setYourSheetResults(null);
    
    try {
      const response = await fetch('/api/test/test-your-spreadsheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spreadsheetUrl: yourSheetUrl })
      });
      const data = await response.json();
      setYourSheetResults(data);
    } catch (error) {
      setYourSheetResults({
        success: false,
        error: 'Failed to test your spreadsheet',
        details: error.message
      });
    } finally {
      setTestingYourSheet(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <TestTube size={24} />
        Google Sheets API Tester
      </h2>
      
      {/* Test 1: Basic API Key Test */}
      <div style={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '20px',
        backgroundColor: 'white'
      }}>
        <h3>Test 1: Google Sheets API Key</h3>
        <p>Tests if your API key is configured and working with a known public spreadsheet.</p>
        
        <button 
          onClick={testGoogleSheetsApi}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TestTube size={16} />}
          {loading ? 'Testing...' : 'Test API Key'}
        </button>

        {testResults && (
          <div style={{ 
            marginTop: '15px', 
            padding: '15px', 
            borderRadius: '6px',
            backgroundColor: testResults.success ? '#f0f9ff' : '#fef2f2',
            border: `1px solid ${testResults.success ? '#bae6fd' : '#fecaca'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {testResults.success ? (
                <CheckCircle size={20} style={{ color: '#059669' }} />
              ) : (
                <XCircle size={20} style={{ color: '#dc2626' }} />
              )}
              <strong style={{ color: testResults.success ? '#059669' : '#dc2626' }}>
                {testResults.success ? 'SUCCESS' : 'FAILED'}
              </strong>
            </div>
            
            <p>{testResults.message || testResults.error}</p>
            
            {testResults.testResults && (
              <div style={{ fontSize: '14px', marginTop: '10px' }}>
                <p><strong>Rows returned:</strong> {testResults.testResults.rowsReturned}</p>
                <p><strong>Test spreadsheet ID:</strong> {testResults.testResults.testSpreadsheetId}</p>
              </div>
            )}
            
            {testResults.guidance && (
              <div style={{ marginTop: '10px' }}>
                <strong>How to fix:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {testResults.guidance.map((item, index) => (
                    <li key={index} style={{ margin: '5px 0' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {testResults.details && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Technical Details</summary>
                <pre style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  marginTop: '5px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(testResults.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Test 2: Your Specific Spreadsheet */}
      <div style={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '20px',
        backgroundColor: 'white'
      }}>
        <h3>Test 2: Your Specific Spreadsheet</h3>
        <p>Tests if your specific Google Sheet is accessible and returns the expected data.</p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Your Google Sheets URL:
          </label>
          <input
            type="url"
            value={yourSheetUrl}
            onChange={(e) => setYourSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <button 
          onClick={testYourSpreadsheet}
          disabled={testingYourSheet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: testingYourSheet ? 'not-allowed' : 'pointer',
            opacity: testingYourSheet ? 0.7 : 1
          }}
        >
          {testingYourSheet ? <Loader2 size={16} className="animate-spin" /> : <TestTube size={16} />}
          {testingYourSheet ? 'Testing...' : 'Test Your Sheet'}
        </button>

        {yourSheetResults && (
          <div style={{ 
            marginTop: '15px', 
            padding: '15px', 
            borderRadius: '6px',
            backgroundColor: yourSheetResults.success ? '#f0f9ff' : '#fef2f2',
            border: `1px solid ${yourSheetResults.success ? '#bae6fd' : '#fecaca'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {yourSheetResults.success ? (
                <CheckCircle size={20} style={{ color: '#059669' }} />
              ) : (
                <XCircle size={20} style={{ color: '#dc2626' }} />
              )}
              <strong style={{ color: yourSheetResults.success ? '#059669' : '#dc2626' }}>
                {yourSheetResults.success ? 'SUCCESS' : 'FAILED'}
              </strong>
            </div>
            
            <p>{yourSheetResults.message || yourSheetResults.error}</p>
            
            {yourSheetResults.results && (
              <div style={{ fontSize: '14px', marginTop: '10px' }}>
                <p><strong>Total rows:</strong> {yourSheetResults.results.totalRows}</p>
                <p><strong>Data rows:</strong> {yourSheetResults.results.dataRows}</p>
                <p><strong>Spreadsheet ID:</strong> {yourSheetResults.results.spreadsheetId}</p>
                
                {yourSheetResults.results.firstRow && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Header row:</strong>
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      marginTop: '5px'
                    }}>
                      {yourSheetResults.results.firstRow.join(' | ')}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {yourSheetResults.details && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Technical Details</summary>
                <pre style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  marginTop: '5px',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(yourSheetResults.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
