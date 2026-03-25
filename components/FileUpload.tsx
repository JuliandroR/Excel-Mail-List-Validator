import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { ExcelRow } from '../types';

interface FileUploadProps {
  onDataLoaded: (headers: string[], rows: ExcelRow[], fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback((file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse with raw: false to get formatted strings if needed, 
        // but raw: true is usually safer for validation.
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
        
        if (jsonData.length === 0) {
          alert("The spreadsheet appears to be empty.");
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(jsonData[0]);
        onDataLoaded(headers, jsonData, file.name);
      } catch (err) {
        console.error(err);
        alert("Error parsing Excel file. Please ensure it is a valid .xlsx file.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
        ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}
        ${isProcessing ? 'opacity-75 pointer-events-none' : ''}
      `}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input 
        type="file" 
        accept=".xlsx, .xls"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleInputChange}
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        {isProcessing ? (
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        ) : (
          <div className="bg-indigo-100 p-4 rounded-full">
             <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-xl font-semibold text-slate-800">
            {isProcessing ? 'Processing File...' : 'Upload Excel File'}
          </p>
          <p className="text-sm text-slate-500">
            Drag and drop your .xlsx file here, or click to browse
          </p>
        </div>
        
        {!isProcessing && (
          <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            Select File
          </button>
        )}
      </div>
    </div>
  );
};