// Resume URL Resolver and Helper Utilities

export const getBackendBaseOrigin = () => {
  // Check Vite environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
  }
  
  return 'https://college-placement-management-system-30p4.onrender.com';
};

/**
 * Returns a canonical, accessible URL for any resume string (Cloudinary HTTPS or local fallback).
 */
export const getResumeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '' || rawUrl === 'Not provided') {
    return '';
  }

  const trimmed = rawUrl.trim();
  const baseOrigin = getBackendBaseOrigin();

  // If already a full http/https URL (e.g. Cloudinary secure_url)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's a localhost URL but we are in production on web, rewrite origin to live backend
    if (trimmed.includes('localhost:5000') && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return trimmed.replace('http://localhost:5000', baseOrigin);
    }
    return trimmed;
  }

  // If relative path like /uploads/resume-xxx.pdf or uploads/resume-xxx.pdf
  if (trimmed.startsWith('/uploads/')) {
    return `${baseOrigin}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${baseOrigin}/${trimmed}`;
  }

  // If it's just a raw filename like resume-12345.pdf
  if (trimmed.endsWith('.pdf') || trimmed.endsWith('.doc') || trimmed.endsWith('.docx')) {
    return `${baseOrigin}/uploads/${trimmed}`;
  }

  return trimmed;
};

/**
 * Generates an embedded preview URL using Google Docs Viewer for seamless in-browser modal viewing.
 */
export const getPreviewViewerUrl = (url) => {
  const resolved = getResumeUrl(url);
  if (!resolved) return '';
  // If it's an online https link (Cloudinary or deployed backend), use Google Docs Viewer for 100% iframe compatibility
  if (resolved.startsWith('https://') || resolved.startsWith('http://')) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(resolved)}&embedded=true`;
  }
  return resolved;
};

/**
 * Helper to safely open resume in a new tab
 */
export const openResumeInNewTab = (url) => {
  const resolved = getResumeUrl(url);
  if (!resolved) return;
  window.open(resolved, '_blank', 'noopener,noreferrer');
};

/**
 * Trigger file download directly in browser
 */
export const downloadResumeFile = (url, candidateName = 'Candidate') => {
  const resolved = getResumeUrl(url);
  if (!resolved) return;
  const link = document.createElement('a');
  link.href = resolved;
  link.setAttribute('download', `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Check if the resume is a previewable PDF
 */
export const isPdfResume = (url) => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf') || clean.includes('/pdf') || clean.includes('.pdf');
};
