import React, { useState, useContext } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';
import { downloadStudentImportTemplateCSV, parseStudentCSV } from '../utils/exportHelper';
import { AuthContext } from '../context/AuthContext';

const BulkImportModal = ({ onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      return toast.error('Please select a valid .csv spreadsheet file.');
    }

    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const students = parseStudentCSV(text);
        if (students.length === 0) {
          return toast.error('Could not find valid student rows in the CSV file.');
        }
        setParsedStudents(students);
        toast.success(`Successfully parsed ${students.length} student record(s) from CSV!`);
      } catch (err) {
        toast.error('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedStudents.length === 0) {
      return toast.error('Please upload a CSV file with student records first.');
    }

    try {
      setLoading(true);
      const res = await API.post('/users/import-students', { students: parsedStudents });
      setImportSummary(res.data);
      toast.success(res.data.message || 'Students imported successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete student import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl p-6 md:p-8 space-y-6 my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-900/40 text-blue-400 rounded-2xl text-xl">📥</div>
            <div>
              <h3 className="text-xl font-bold text-white">Bulk Import Student Database (CSV)</h3>
              <p className="text-xs text-gray-400">Import student academic profiles into the placement portal in bulk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Template Download & Instructions */}
        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
          <div>
            <p className="font-bold text-white mb-0.5">Need the import spreadsheet format?</p>
            <p className="text-gray-400">Download our sample CSV template with pre-formatted columns (Name, Email, Dept, CGPA, etc.).</p>
          </div>
          <button
            type="button"
            onClick={downloadStudentImportTemplateCSV}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-blue-300 font-bold rounded-xl border border-blue-500/30 flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
          >
            <span>⬇️ Download Sample CSV Template</span>
          </button>
        </div>

        {/* File Dropzone / Selector */}
        {!importSummary && (
          <div className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-6 text-center bg-gray-950/40 transition-colors">
            <input
              type="file"
              accept=".csv, .txt"
              id="csvUploadInput"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="csvUploadInput" className="cursor-pointer block space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-900/30 text-blue-400 flex items-center justify-center text-xl">
                📄
              </div>
              <p className="text-sm font-bold text-white">
                {fileName ? `Selected: ${fileName}` : 'Click to select or drag & drop a Student CSV file'}
              </p>
              <p className="text-xs text-gray-400">
                Supports .csv files with columns for Full Name, Email, Department, CGPA, and Graduation Year
              </p>
            </label>
          </div>
        )}

        {/* Import Summary Results */}
        {importSummary && (
          <div className="bg-green-950/40 border border-green-800/80 p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
              <span>✓ {importSummary.message}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-400 block mb-0.5">Total Processed</span>
                <strong className="text-base text-white">{importSummary.totalProcessed}</strong>
              </div>
              <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-400 block mb-0.5">Imported</span>
                <strong className="text-base text-green-400">+{importSummary.importedCount}</strong>
              </div>
              <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-400 block mb-0.5">Skipped / Duplicates</span>
                <strong className="text-base text-yellow-400">{importSummary.duplicateCount}</strong>
              </div>
            </div>

            {importSummary.skippedRecords?.length > 0 && (
              <div className="bg-gray-900/90 p-3 rounded-xl text-xs space-y-1 max-h-28 overflow-y-auto">
                <p className="font-bold text-yellow-400">Skipped Records Details:</p>
                {importSummary.skippedRecords.map((s, idx) => (
                  <p key={idx} className="text-gray-400 text-[11px]">
                    • <strong className="text-gray-300">{s.email || s.name}</strong>: {s.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedStudents.length > 0 && !importSummary && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-300">
                Previewing Records ({parsedStudents.length} Students)
              </span>
              <span className="text-green-400 font-semibold">Ready to Import</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-56 rounded-xl border border-gray-800 bg-gray-950/60">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900 text-gray-400 border-b border-gray-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">CGPA</th>
                    <th className="p-2.5">Grad Year</th>
                    <th className="p-2.5">Backlogs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {parsedStudents.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/40">
                      <td className="p-2.5 text-gray-500 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-white">{s.name}</td>
                      <td className="p-2.5 text-blue-300">{s.email}</td>
                      <td className="p-2.5 text-gray-300">{s.department}</td>
                      <td className="p-2.5 font-bold text-yellow-300">{s.cgpa}</td>
                      <td className="p-2.5 text-gray-400">{s.graduationYear}</td>
                      <td className="p-2.5 text-gray-400">{s.activeBacklogs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
          >
            {importSummary ? 'Close Window' : 'Cancel'}
          </button>

          {!importSummary && (
            <button
              onClick={handleExecuteImport}
              disabled={parsedStudents.length === 0 || loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Processing Bulk Import...</span>
                </>
              ) : (
                `Import ${parsedStudents.length} Students to Portal`
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default BulkImportModal;
