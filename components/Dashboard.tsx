import React, { useState, useMemo } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Filter, 
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileCheck,
  Copy
} from 'lucide-react';
import { ProcessedData, ValidationStatus, ValidationResult } from '../types';
import * as XLSX from 'xlsx';
import { generateDataQualityReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  data: ProcessedData;
  fileName: string;
  onReset: () => void;
  onColumnChange: (col: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, fileName, onReset, onColumnChange }) => {
  const [filter, setFilter] = useState<'ALL' | ValidationStatus>('ALL');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = data.validationResults.length;
    const valid = data.validationResults.filter(r => r.status === ValidationStatus.VALID).length;
    const invalid = data.validationResults.filter(r => r.status === ValidationStatus.INVALID_FORMAT).length;
    const whitespace = data.validationResults.filter(r => r.status === ValidationStatus.WHITESPACE_ISSUE).length;
    const duplicate = data.validationResults.filter(r => r.status === ValidationStatus.DUPLICATE).length;
    return { total, valid, invalid, whitespace, duplicate };
  }, [data.validationResults]);

  // Filtered Data
  const filteredResults = useMemo(() => {
    if (filter === 'ALL') return data.validationResults;
    return data.validationResults.filter(r => r.status === filter);
  }, [data.validationResults, filter]);

  const handleDownloadReport = () => {
    // Create a new dataset combining original rows with validation status
    const exportData = data.rows.map((row, index) => {
      const result = data.validationResults[index];
      return {
        ...row,
        ValidationStatus: result.status,
        ValidationDetails: result.details || 'OK',
        CleanedEmail: result.email
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validated Emails");
    XLSX.writeFile(wb, `full_report_${fileName}`);
  };

  const handleDownloadClean = () => {
    // Filtra apenas VALID e WHITESPACE_ISSUE
    // Para WHITESPACE_ISSUE, substitui o email original pelo corrigido (sem espaços)
    const cleanRows = data.rows.reduce((acc: any[], row, index) => {
      const result = data.validationResults[index];
      const targetCol = data.detectedEmailColumn;

      // Apenas inclui se for Válido ou tiver problema de Espaço (que será corrigido)
      if (result.status === ValidationStatus.VALID || result.status === ValidationStatus.WHITESPACE_ISSUE) {
        // Clona a linha para não mutar o estado original
        const newRow = { ...row };
        
        // Se for problema de whitespace, ATUALIZA a coluna com o email limpo
        if (result.status === ValidationStatus.WHITESPACE_ISSUE && targetCol && result.email) {
          newRow[targetCol] = result.email;
        }

        acc.push(newRow);
      }
      // Linhas INVALID_FORMAT ou EMPTY são ignoradas (excluídas)
      return acc;
    }, []);

    if (cleanRows.length === 0) {
      alert("Não há linhas válidas para exportar.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(cleanRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clean Data");
    XLSX.writeFile(wb, `clean_corrected_${fileName}`);
  };

  const handleAIAnalysis = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    const report = await generateDataQualityReport(data.validationResults);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{fileName}</h2>
          <p className="text-slate-500 text-sm">
            Analysis based on column: <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">{data.detectedEmailColumn || 'None'}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
             onClick={onReset}
             className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" /> Full Report
          </button>

          <button 
            onClick={handleDownloadClean}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md transition-all"
            title="Baixar apenas emails válidos (corrige espaços automaticamente)"
          >
            <FileCheck className="w-4 h-4" /> Download Clean List
          </button>
        </div>
      </div>

      {/* Column Selector Warning (if detection was shaky or user wants to change) */}
      <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border border-slate-200">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          Target Column:
          <select 
            value={data.detectedEmailColumn || ''}
            onChange={(e) => onColumnChange(e.target.value)}
            className="ml-2 border border-slate-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {data.headers.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500 hidden md:block">
          Change this if the wrong column was detected automatically.
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard 
          title="Total Rows" 
          value={stats.total} 
          icon={<Filter className="w-5 h-5 text-slate-500" />} 
          color="bg-white"
        />
        <StatsCard 
          title="Valid Emails" 
          value={stats.valid} 
          icon={<CheckCircle className="w-5 h-5 text-green-500" />} 
          color="bg-green-50"
          borderColor="border-green-200"
        />
        <StatsCard 
          title="Invalid Format" 
          value={stats.invalid} 
          icon={<XCircle className="w-5 h-5 text-red-500" />} 
          color="bg-red-50"
          borderColor="border-red-200"
        />
        <StatsCard 
          title="Whitespace Issues" 
          value={stats.whitespace} 
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} 
          color="bg-amber-50"
          borderColor="border-amber-200"
        />
        <StatsCard 
          title="Duplicates" 
          value={stats.duplicate} 
          icon={<Copy className="w-5 h-5 text-purple-500" />} 
          color="bg-purple-50"
          borderColor="border-purple-200"
        />
      </div>

      {/* AI Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-900">AI Data Analysis</h3>
              <p className="text-sm text-indigo-700">Get insights on your data quality powered by Gemini.</p>
            </div>
          </div>
          <button 
            onClick={handleAIAnalysis}
            disabled={isGeneratingReport}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-all shadow-sm"
          >
            {isGeneratingReport ? 'Analyzing...' : 'Generate Analysis'}
          </button>
        </div>
        
        {aiReport && (
          <div className="bg-white/80 p-6 rounded-lg border border-indigo-100 prose prose-sm max-w-none text-slate-700">
             <ReactMarkdown>{aiReport}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex gap-2 overflow-x-auto">
          <FilterButton 
            label="All" 
            count={stats.total} 
            active={filter === 'ALL'} 
            onClick={() => setFilter('ALL')} 
          />
          <FilterButton 
            label="Valid" 
            count={stats.valid} 
            active={filter === ValidationStatus.VALID} 
            onClick={() => setFilter(ValidationStatus.VALID)}
            color="text-green-700 bg-green-50 border-green-200"
          />
          <FilterButton 
            label="Invalid" 
            count={stats.invalid} 
            active={filter === ValidationStatus.INVALID_FORMAT} 
            onClick={() => setFilter(ValidationStatus.INVALID_FORMAT)} 
            color="text-red-700 bg-red-50 border-red-200"
          />
          <FilterButton 
            label="Whitespace" 
            count={stats.whitespace} 
            active={filter === ValidationStatus.WHITESPACE_ISSUE} 
            onClick={() => setFilter(ValidationStatus.WHITESPACE_ISSUE)} 
            color="text-amber-700 bg-amber-50 border-amber-200"
          />
          <FilterButton 
            label="Duplicate" 
            count={stats.duplicate} 
            active={filter === ValidationStatus.DUPLICATE} 
            onClick={() => setFilter(ValidationStatus.DUPLICATE)} 
            color="text-purple-700 bg-purple-50 border-purple-200"
          />
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-700 w-16">#</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Original Value</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="px-6 py-3 font-mono text-slate-800">{row.original}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                     {row.details || '-'}
                     {row.status === ValidationStatus.WHITESPACE_ISSUE && (
                       <span className="flex items-center gap-1 mt-1 text-xs text-indigo-600 font-medium">
                         <ArrowRight className="w-3 h-3" /> Cleaned: {row.email}
                       </span>
                     )}
                  </td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No results found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sub-components for cleaner code
const StatsCard = ({ title, value, icon, color, borderColor = 'border-slate-200' }: any) => (
  <div className={`p-4 rounded-xl border ${borderColor} ${color} shadow-sm flex items-center justify-between`}>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value.toLocaleString()}</p>
    </div>
    <div className="p-3 bg-white bg-opacity-60 rounded-lg backdrop-blur-sm">
      {icon}
    </div>
  </div>
);

const FilterButton = ({ label, count, active, onClick, color = 'text-slate-700 bg-white border-slate-200' }: any) => (
  <button 
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-full border text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap
      ${active ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:bg-slate-50'}
      ${active && color === 'text-slate-700 bg-white border-slate-200' ? 'bg-slate-800 text-white border-slate-800' : color}
    `}
  >
    {label}
    <span className={`px-1.5 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-slate-200/50'}`}>
      {count}
    </span>
  </button>
);

const StatusBadge = ({ status }: { status: ValidationStatus }) => {
  switch (status) {
    case ValidationStatus.VALID:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Valid</span>;
    case ValidationStatus.INVALID_FORMAT:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Invalid</span>;
    case ValidationStatus.WHITESPACE_ISSUE:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Whitespace</span>;
    case ValidationStatus.DUPLICATE:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Duplicate</span>;
    case ValidationStatus.EMPTY:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Empty</span>;
    default:
      return null;
  }
};