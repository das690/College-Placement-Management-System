// CSV Export and Import Utilities for College Placement Management System
import { getResumeUrl } from './resumeHelper';

/**
 * Trigger download of raw CSV content as a file
 */
export const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export Placement Drive Full Report CSV
 */
export const exportDriveReportCSV = (drives, jobs, apps, selectedDriveId = 'ALL') => {
  const targetDrive = selectedDriveId === 'ALL' ? null : drives.find(d => d._id === selectedDriveId);
  const driveName = targetDrive ? targetDrive.name : 'All_Placement_Drives';
  
  let filteredApps = apps;
  if (selectedDriveId !== 'ALL') {
    filteredApps = apps.filter(app => {
      const driveId = typeof app.drive === 'object' ? app.drive?._id : (app.drive || app.job?.drive?._id || app.job?.drive);
      return driveId === selectedDriveId;
    });
  }

  const headers = [
    'Placement Drive',
    'Position Title',
    'Recruiting Organization',
    'Student Full Name',
    'Student Email',
    'Department',
    'CGPA',
    'Active Backlogs',
    'Current Stage / Status',
    'Latest Round Evaluation',
    'Round Score',
    'Round Feedback Notes',
    'Interview Date',
    'Interview Time',
    'Interview Link',
    'Cloud Resume URL'
  ];

  const rows = filteredApps.map(app => {
    const latestRound = app.rounds && app.rounds.length > 0 ? app.rounds[app.rounds.length - 1] : null;
    return [
      `"${(app.drive?.name || app.job?.drive?.name || 'Campus Drive').replace(/"/g, '""')}"`,
      `"${(app.job?.title || 'N/A').replace(/"/g, '""')}"`,
      `"${(app.job?.company?.name || 'N/A').replace(/"/g, '""')}"`,
      `"${(app.student?.name || 'Candidate').replace(/"/g, '""')}"`,
      `"${(app.student?.email || 'N/A').replace(/"/g, '""')}"`,
      `"${(app.student?.academicDetails?.department || 'N/A').replace(/"/g, '""')}"`,
      app.student?.academicDetails?.cgpa !== undefined ? app.student?.academicDetails?.cgpa : 'N/A',
      app.student?.academicDetails?.activeBacklogs !== undefined ? app.student?.academicDetails?.activeBacklogs : '0',
      `"${app.status || 'Applied'}"`,
      `"${(latestRound?.roundName || 'N/A').replace(/"/g, '""')}"`,
      `"${(latestRound?.score || 'N/A').replace(/"/g, '""')}"`,
      `"${(latestRound?.feedback || 'N/A').replace(/"/g, '""')}"`,
      `"${app.interviewDate || 'N/A'}"`,
      `"${app.interviewTime || 'N/A'}"`,
      `"${app.interviewLink || 'N/A'}"`,
      `"${getResumeUrl(app.resumeUrl) || 'N/A'}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const fileName = `${driveName.replace(/\s+/g, '_')}_Placement_Report_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, fileName);
};

/**
 * Export Department-wise Placement Statistics Report CSV
 */
export const exportDepartmentPlacementCSV = (deptStats, selectedDriveName = 'All Drives') => {
  const headers = [
    'Department Code',
    'Department Name',
    'Total Applications',
    'Candidates Shortlisted',
    'Candidates Hired / Selected',
    'Placement Success Rate (%)',
    'Average Salary Package',
    'Top Recruiting Companies'
  ];

  const rows = deptStats.map(dept => {
    const rate = dept.applications > 0 ? Math.round((dept.selected / dept.applications) * 100) : 0;
    return [
      `"${(dept.code || 'N/A').replace(/"/g, '""')}"`,
      `"${(dept.department || dept.name || 'General').replace(/"/g, '""')}"`,
      dept.applications || 0,
      dept.shortlisted || 0,
      dept.selected || 0,
      `"${rate}%"`,
      `"${dept.avgSalary || 'Competitive'}"`,
      `"${(dept.companies || []).join('; ').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const fileName = `Department_Placements_${selectedDriveName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, fileName);
};

/**
 * Export Job Applicants Pipeline CSV
 */
export const exportApplicantsCSV = (jobTitle, applicants = []) => {
  const headers = [
    'Candidate Name',
    'Candidate Email',
    'Department',
    'CGPA',
    'Active Backlogs',
    'Graduation Year',
    'Current Stage / Status',
    'Total Rounds Evaluated',
    'Latest Round Status',
    'Latest Round Feedback',
    'Scheduled Interview Date',
    'Cloud Resume Link'
  ];

  const rows = applicants.map(app => {
    const latestRound = app.rounds && app.rounds.length > 0 ? app.rounds[app.rounds.length - 1] : null;
    return [
      `"${(app.student?.name || 'Candidate').replace(/"/g, '""')}"`,
      `"${(app.student?.email || 'N/A').replace(/"/g, '""')}"`,
      `"${(app.student?.academicDetails?.department || 'N/A').replace(/"/g, '""')}"`,
      app.student?.academicDetails?.cgpa !== undefined ? app.student?.academicDetails?.cgpa : 'N/A',
      app.student?.academicDetails?.activeBacklogs !== undefined ? app.student?.academicDetails?.activeBacklogs : 0,
      app.student?.academicDetails?.graduationYear || 2026,
      `"${app.status || 'Applied'}"`,
      app.rounds?.length || 0,
      `"${latestRound ? `${latestRound.roundName} (${latestRound.status})` : 'Pending'}"`,
      `"${(latestRound?.feedback || 'None').replace(/"/g, '""')}"`,
      `"${app.interviewDate ? `${app.interviewDate} ${app.interviewTime || ''}` : 'Not Scheduled'}"`,
      `"${getResumeUrl(app.resumeUrl) || 'N/A'}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const fileName = `Applicants_${(jobTitle || 'Position').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, fileName);
};

/**
 * Download Sample CSV Template for Student Bulk Import
 */
export const downloadStudentImportTemplateCSV = () => {
  const headers = [
    'Full Name',
    'Email Address',
    'Department',
    'CGPA',
    'Graduation Year',
    'Active Backlogs',
    'Skills',
    'Temporary Password'
  ];

  const sampleRows = [
    ['"John Doe"', '"john.doe@example.com"', '"Computer Science & Engineering"', '8.75', '2026', '0', '"React, Node.js, Python"', '"Student@2026"'],
    ['"Jane Smith"', '"jane.smith@example.com"', '"Information Technology"', '9.10', '2026', '0', '"Java, Spring Boot, SQL"', '"Student@2026"'],
    ['"Alex Johnson"', '"alex.j@example.com"', '"Electronics & Communication Engineering"', '7.80', '2026', '1', '"Embedded C, IoT, Python"', '"Student@2026"'],
    ['"Priya Sharma"', '"priya.s@example.com"', '"Mechanical Engineering"', '8.25', '2026', '0', '"AutoCAD, SolidWorks, MATLAB"', '"Student@2026"']
  ];

  const csvContent = [headers.join(','), ...sampleRows.map(e => e.join(','))].join('\n');
  downloadCSV(csvContent, 'students_bulk_import_template.csv');
};

/**
 * Parse CSV text into array of student objects
 */
export const parseStudentCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header line
  const parseCSVLine = (text) => {
    const result = [];
    let insideQuotes = false;
    let current = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^["']|["']$/g, '').trim());
  };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const students = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const studentObj = {
      name: row.fullname || row.name || values[0] || '',
      email: row.emailaddress || row.email || values[1] || '',
      department: row.department || row.dept || values[2] || 'Computer Science & Engineering',
      cgpa: row.cgpa || values[3] || '8.0',
      graduationYear: row.graduationyear || row.year || values[4] || '2026',
      activeBacklogs: row.activebacklogs || row.backlogs || values[5] || '0',
      skills: row.skills || values[6] || '',
      password: row.temporarypassword || row.password || values[7] || 'Student@2026'
    };

    if (studentObj.name && studentObj.email) {
      students.push(studentObj);
    }
  }

  return students;
};
