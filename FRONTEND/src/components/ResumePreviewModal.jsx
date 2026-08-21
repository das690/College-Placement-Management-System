import React from 'react';
import { getResumeUrl, getPreviewViewerUrl, openResumeInNewTab, downloadResumeFile, isPdfResume } from '../utils/resumeHelper';

const ResumePreviewModal = ({ resumeData, onClose }) => {
  if (!resumeData || !resumeData.url) return null;

  const rawUrl = resumeData.url;
  const canonicalUrl = getResumeUrl(rawUrl);
  const previewViewerUrl = getPreviewViewerUrl(rawUrl);
  const isPdf = isPdfResume(canonicalUrl);

  return (
    <div className="fixed inset-0 pt-16 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-gray-800/90 border-b border-gray-700 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/40 text-blue-400 rounded-xl text-lg">📄</div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {resumeData.studentName ? `${resumeData.studentName}'s Resume` : 'Candidate Resume Document'}
              </h3>
              {resumeData.positionTitle && (
                <p className="text-xs text-blue-400 font-medium">Applied Position: {resumeData.positionTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openResumeInNewTab(canonicalUrl)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md"
            >
              <span>🔗 Open in New Tab</span>
            </button>
            <button
              type="button"
              onClick={() => downloadResumeFile(canonicalUrl, resumeData.studentName || 'Candidate')}
              className="px-3.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>⬇️ Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewer Frame */}
        <div className="flex-1 p-2 bg-gray-950/80 overflow-hidden flex flex-col min-h-[500px]">
          {isPdf || canonicalUrl.includes('cloudinary') || canonicalUrl.includes('/uploads/') || canonicalUrl.includes('/view/') ? (
            <iframe
              src={previewViewerUrl || canonicalUrl}
              title="Candidate Resume Preview"
              className="w-full flex-1 rounded-xl border border-gray-800 bg-white"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 bg-gray-800 rounded-2xl text-blue-400 text-3xl">📄</div>
              <div>
                <h4 className="text-lg font-bold text-white">External Resume Link</h4>
                <p className="text-gray-400 text-xs max-w-md mt-1">
                  This document is hosted on an external URL or direct cloud link.
                </p>
              </div>
              <button
                onClick={() => openResumeInNewTab(canonicalUrl)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition-colors inline-flex items-center gap-2"
              >
                Open Document &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-800/80 border-t border-gray-700 flex justify-between items-center text-xs text-gray-400">
          <span className="truncate max-w-md font-mono text-[11px] text-gray-500">{canonicalUrl}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResumePreviewModal;
