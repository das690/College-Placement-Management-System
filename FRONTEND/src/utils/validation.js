// Client-Side Validation Utilities for Forms and Profiles

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return 'Email address is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address (e.g. user@domain.com).';
  }
  return null;
};

export const validatePassword = (password, minLength = 6) => {
  if (!password) return 'Password is required.';
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters long.`;
  }
  return null;
};

export const validateDrive = (drive) => {
  const errors = {};
  const todayStr = new Date().toISOString().split('T')[0];

  if (!drive.name || drive.name.trim().length < 3) {
    errors.name = 'Drive Name is required (minimum 3 characters).';
  }

  if (drive.academicYear && !/^\d{4}-\d{4}$/.test(drive.academicYear.trim())) {
    errors.academicYear = 'Academic year should follow YYYY-YYYY format (e.g. 2025-2026).';
  }

  if (drive.startDate && drive.startDate < todayStr) {
    errors.startDate = 'Drive Start Date cannot be set in the past.';
  }

  if (drive.endDate && drive.startDate && drive.endDate < drive.startDate) {
    errors.endDate = 'Drive End Date cannot be earlier than Start Date.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateJob = (job) => {
  const errors = {};

  if (!job.drive) {
    errors.drive = 'You must select a Placement Drive.';
  }

  if (!job.title || job.title.trim().length < 2) {
    errors.title = 'Position Title is required (minimum 2 characters).';
  }

  if (!job.location || job.location.trim().length < 2) {
    errors.location = 'Job location is required.';
  }

  if (!job.description || job.description.trim().length < 15) {
    errors.description = 'Detailed job description is required (minimum 15 characters).';
  }

  if (!job.requirements || job.requirements.trim().length < 2) {
    errors.requirements = 'Required tech stack / qualifications are required.';
  }

  if (job.minCgpa !== undefined && job.minCgpa !== '') {
    const cgpaNum = Number(job.minCgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      errors.minCgpa = 'Minimum CGPA must be between 0.0 and 10.0.';
    }
  }

  if (job.maxBacklogs !== undefined && job.maxBacklogs !== '') {
    const backlogsNum = Number(job.maxBacklogs);
    if (isNaN(backlogsNum) || backlogsNum < 0 || !Number.isInteger(backlogsNum)) {
      errors.maxBacklogs = 'Maximum backlogs must be a non-negative whole number (>= 0).';
    }
  }

  if (job.targetGraduationYear) {
    const yearNum = Number(job.targetGraduationYear);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2035) {
      errors.targetGraduationYear = 'Please enter a valid graduation year (between 2020 and 2035).';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateStudentProfile = (profile) => {
  const errors = {};

  if (!profile.department || profile.department.trim() === '') {
    errors.department = 'Department is required.';
  }

  if (profile.cgpa === undefined || profile.cgpa === null || String(profile.cgpa).trim() === '') {
    errors.cgpa = 'CGPA is required.';
  } else {
    const cgpaNum = Number(profile.cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      errors.cgpa = 'CGPA must be between 0.0 and 10.0.';
    }
  }

  if (!profile.graduationYear) {
    errors.graduationYear = 'Graduation Year is required.';
  } else {
    const yearNum = Number(profile.graduationYear);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2035) {
      errors.graduationYear = 'Graduation Year must be between 2020 and 2035.';
    }
  }

  if (profile.activeBacklogs !== undefined && profile.activeBacklogs !== '') {
    const backlogsNum = Number(profile.activeBacklogs);
    if (isNaN(backlogsNum) || backlogsNum < 0 || !Number.isInteger(backlogsNum)) {
      errors.activeBacklogs = 'Backlogs count must be a non-negative integer (>= 0).';
    }
  }

  if (!profile.resumeUrl || String(profile.resumeUrl).trim() === '') {
    errors.resumeUrl = 'A PDF resume or resume link is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateInterview = (interview) => {
  const errors = {};
  const todayStr = new Date().toISOString().split('T')[0];

  if (!interview.date) {
    errors.date = 'Interview date is required.';
  } else if (interview.date < todayStr) {
    errors.date = 'Interview date cannot be scheduled in the past.';
  }

  if (!interview.time || interview.time.trim() === '') {
    errors.time = 'Interview time is required.';
  }

  if (!interview.stage) {
    errors.stage = 'Recruitment stage is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
