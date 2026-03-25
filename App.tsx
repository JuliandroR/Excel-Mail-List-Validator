import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { ExcelRow, ProcessedData, ValidationStatus } from './types';
import { detectEmailColumn, validateEmail } from './services/emailValidator';
import { ShieldCheck, Info } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<ProcessedData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const processData = useCallback((headers: string[], rows: ExcelRow[], file: string, specificColumn?: string) => {
    // 1. Detect column if not specified
    const targetColumn = specificColumn || detectEmailColumn(headers, rows);
    
    // 2. Validate rows
    let results: any[] = [];
    if (targetColumn) {
      const seenEmails = new Set<string>();
      results = rows.map(row => {
        const cellValue = row[targetColumn];
        const result = validateEmail(cellValue);
        
        if (result.status === ValidationStatus.VALID || result.status === ValidationStatus.WHITESPACE_ISSUE) {
          const normalizedEmail = result.email.toLowerCase();
          if (seenEmails.has(normalizedEmail)) {
            result.status = ValidationStatus.DUPLICATE;
            result.details = 'Duplicate email address';
          } else {
            seenEmails.add(normalizedEmail);
          }
        }
        
        return result;
      });
    } else {
      // If no column found/selected, we can't validate yet
      results = [];
    }

    setData({
      headers,
      rows,
      detectedEmailColumn: targetColumn,
      validationResults: results
    });
    setFileName(file);
  }, []);

  const handleDataLoaded = (headers: string[], rows: ExcelRow[], file: string) => {
    processData(headers, rows, file);
  };

  const handleReset = () => {
    setData(null);
    setFileName('');
  };

  const handleColumnChange = (newCol: string) => {
    if (data) {
      processData(data.headers, data.rows, fileName, newCol);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
               <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Excel Email Validator
            </h1>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            Secure, Client-side Processing
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!data ? (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Validate your email lists instantly.
              </h2>
              <p className="text-lg text-slate-600">
                Upload your Excel file. We'll find the email column, check for syntax errors, 
                identify hidden whitespace, and provide AI-powered quality insights.
              </p>
            </div>

            <FileUpload onDataLoaded={handleDataLoaded} />

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Detects columns named "email", "e-mail", etc. automatically.</li>
                  <li>Validates format (user@domain.com).</li>
                  <li>Flags leading/trailing spaces often hidden in Excel.</li>
                  <li>Your data stays in your browser until you ask for AI analysis.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <Dashboard 
            data={data} 
            fileName={fileName} 
            onReset={handleReset} 
            onColumnChange={handleColumnChange}
          />
        )}
      </main>
    </div>
  );
};

export default App;