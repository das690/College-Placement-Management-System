import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';

// Utilities
import { getResumeUrl, openResumeInNewTab } from '../utils/resumeHelper';
import { validateDrive, validateJob, validateStudentProfile, validateInterview } from '../utils/validation';
import { COLLEGE_DEPARTMENTS, DEPARTMENT_OPTIONS, isDepartmentEligible } from '../utils/departments';
import { exportDriveReportCSV, exportApplicantsCSV } from '../utils/exportHelper';

// Modular Components
import DepartmentAnalytics from '../components/DepartmentAnalytics';
import CommunicationCenter from '../components/CommunicationCenter';
import BulkImportModal from '../components/BulkImportModal';
import RoundEvaluationModal from '../components/RoundEvaluationModal';
import RoundTimelineCard from '../components/RoundTimelineCard';
import ResumePreviewModal from '../components/ResumePreviewModal';

const RECRUITMENT_STAGES = [
  'Applied',
  'Shortlisted',
  'Assessment Round',
  'Technical Interview',
  'HR Interview',
  'Selected',
  'Rejected',
  'Terminated',
  'Withdrawn'
];

const getMissingAcademicFields = (u) => {
  if (!u || u.role !== 'student') return [];
  const details = u.academicDetails || {};
  const missing = [];
  if (!details.department || String(details.department).trim() === '') missing.push('Department');
  if (details.cgpa === undefined || details.cgpa === null || String(details.cgpa).trim() === '') missing.push('CGPA');
  if (!details.graduationYear) missing.push('Graduation Year');
  if (!details.resumeUrl || String(details.resumeUrl).trim() === '') missing.push('Resume PDF');
  return missing;
};

const Dashboard = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { view } = useParams(); 
  const currentView = view || 'overview'; 

  // Global Data State
  const [drives, setDrives] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drive Filter State for Reports & Analytics
  const [selectedDriveFilter, setSelectedDriveFilter] = useState('ALL');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Drive Creation State (Admin)
  const [newDrive, setNewDrive] = useState({ 
    name: '', 
    description: '', 
    academicYear: '2025-2026',
    startDate: '',
    endDate: '',
    status: 'Active' 
  });
  const [driveErrors, setDriveErrors] = useState({});

  // Drive Editing State (Admin)
  const [showEditDriveModal, setShowEditDriveModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [editDriveErrors, setEditDriveErrors] = useState({});

  // Position Creation State (Company / Admin)
  const [newJob, setNewJob] = useState({
    title: '', 
    description: '', 
    requirements: '', 
    location: '', 
    salary: '', 
    drive: '', 
    minCgpa: 0, 
    maxBacklogs: 0, 
    allowedDepartments: [], // array of department codes / names
    targetGraduationYear: 2026
  });
  const [jobErrors, setJobErrors] = useState({});

  // Position Editing State (Company / Admin)
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [editJobErrors, setEditJobErrors] = useState({});

  // In-App Resume Preview State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [previewResume, setPreviewResume] = useState({ url: '', studentName: '', positionTitle: '' });

  // Student Profile State
  const [studentProfile, setStudentProfile] = useState({ 
    department: '', 
    graduationYear: 2026, 
    cgpa: '', 
    activeBacklogs: 0,
    skills: '',
    certifications: '',
    resumeUrl: ''
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Student Profile Resume Upload State
  const [profileResumeFile, setProfileResumeFile] = useState(null);
  const [isUploadingProfileResume, setIsUploadingProfileResume] = useState(false);

  // Application & Interview Modals
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({ date: '', time: '', link: '', stage: 'Technical Interview' });
  const [interviewErrors, setInterviewErrors] = useState({});

  // Quick-Fill Missing Profile Modal State
  const [showQuickProfileModal, setShowQuickProfileModal] = useState(false);
  const [quickProfileData, setQuickProfileData] = useState({ 
    department: '', 
    graduationYear: 2026, 
    cgpa: '', 
    activeBacklogs: 0,
    resumeUrl: ''
  });
  const [quickResumeFile, setQuickResumeFile] = useState(null);
  const [quickProfileErrors, setQuickProfileErrors] = useState({});
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  // Round Evaluation Modal State
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [selectedAppForRound, setSelectedAppForRound] = useState(null);

  // Bulk Student Import Modal State (Admin)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Sync Student Profile on User Load
  useEffect(() => {
    if (user && user.academicDetails) {
      setStudentProfile({
        department: user.academicDetails.department || '',
        graduationYear: user.academicDetails.graduationYear || 2026,
        cgpa: user.academicDetails.cgpa !== undefined ? user.academicDetails.cgpa : '',
        activeBacklogs: user.academicDetails.activeBacklogs || 0,
        skills: Array.isArray(user.academicDetails.skills) ? user.academicDetails.skills.join(', ') : '',
        certifications: Array.isArray(user.academicDetails.certifications) ? user.academicDetails.certifications.join(', ') : '',
        resumeUrl: user.academicDetails.resumeUrl || ''
      });
      setQuickProfileData({
        department: user.academicDetails.department || '',
        graduationYear: user.academicDetails.graduationYear || 2026,
        cgpa: user.academicDetails.cgpa !== undefined ? user.academicDetails.cgpa : '',
        activeBacklogs: user.academicDetails.activeBacklogs || 0,
        resumeUrl: user.academicDetails.resumeUrl || ''
      });
    }
  }, [user]);

  // Initial Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [drivesRes, jobsRes, appsRes] = await Promise.all([
        API.get('/drives'),
        API.get('/jobs'),
        API.get('/applications')
      ]);
      
      setDrives(drivesRes.data);
      const allJobs = jobsRes.data;
      let allApps = appsRes.data;

      // Populate full job details into applications if needed
      allApps = allApps.map(app => {
        const jobId = typeof app.job === 'object' ? app.job?._id : app.job;
        const fullJobDetails = allJobs.find(j => j._id === jobId);
        return { ...app, job: fullJobDetails || app.job };
      });

      if (user.role === 'admin') {
        setJobs(allJobs);
        setApplications(allApps);
      } else if (user.role === 'student') {
        setJobs(allJobs);
        setApplications(allApps.filter(app => (typeof app.student === 'object' ? app.student?._id : app.student) === user._id));
      } else if (user.role === 'company') {
        const myJobs = allJobs.filter(job => (typeof job.company === 'object' ? job.company?._id : job.company) === user._id);
        setJobs(myJobs);
        const myJobIds = myJobs.map(j => j._id);
        setApplications(allApps.filter(app => myJobIds.includes(typeof app.job === 'object' ? app.job?._id : app.job)));
      }
    } catch (error) {
      toast.error("Failed to fetch placement dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // ================= ELIGIBILITY ENGINE HELPER =================
  const checkEligibility = (job) => {
    if (!user || user.role !== 'student') return { eligible: true, reasons: [] };
    
    const details = user.academicDetails || {};
    const reasons = [];

    // Detailed Profile completion check
    const missingFields = getMissingAcademicFields(user);
    if (missingFields.length > 0) {
      reasons.push(`Academic Profile Incomplete: Missing (${missingFields.join(', ')})`);
    }

    const { minCgpa = 0, maxBacklogs = 0, allowedDepartments = [], targetGraduationYear } = job.eligibility || {};

    // 1. CGPA Check
    if (details.cgpa !== undefined && details.cgpa !== null && details.cgpa !== '') {
      if (minCgpa > 0 && Number(details.cgpa) < minCgpa) {
        reasons.push(`Minimum CGPA required: ${minCgpa} (Yours: ${details.cgpa})`);
      }
    }

    // 2. Active Backlogs Check
    if (details.activeBacklogs !== undefined && Number(details.activeBacklogs) > maxBacklogs) {
      reasons.push(`Maximum backlogs allowed: ${maxBacklogs} (Yours: ${details.activeBacklogs})`);
    }

    // 3. Department Check (Smart Alias Normalization)
    if (allowedDepartments && allowedDepartments.length > 0 && details.department) {
      const isEligibleDept = isDepartmentEligible(details.department, allowedDepartments);
      if (!isEligibleDept) {
        reasons.push(`Allowed departments: ${allowedDepartments.join(', ')} (Yours: ${details.department})`);
      }
    }

    // 4. Graduation Year Check
    if (targetGraduationYear && details.graduationYear && Number(details.graduationYear) !== Number(targetGraduationYear)) {
      reasons.push(`Target Graduation Year: ${targetGraduationYear} (Yours: ${details.graduationYear})`);
    }

    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

  const handleUploadProfileResume = async (fileToUpload) => {
    const file = fileToUpload || profileResumeFile;
    if (!file) return toast.error("Please select a PDF resume file to upload");
    try {
      setIsUploadingProfileResume(true);
      const formData = new FormData();
      formData.append('resume', file);
      
      const res = await API.post('/upload', formData);
      const uploadedUrl = res.data.resumeUrl;

      setStudentProfile(prev => ({ ...prev, resumeUrl: uploadedUrl }));
      setQuickProfileData(prev => ({ ...prev, resumeUrl: uploadedUrl }));

      // Auto-save to User profile in DB immediately
      const updatedUserRes = await API.put('/users/profile', {
        department: studentProfile.department || user.academicDetails?.department || '',
        graduationYear: Number(studentProfile.graduationYear || user.academicDetails?.graduationYear || 2026),
        cgpa: (studentProfile.cgpa !== '' && studentProfile.cgpa !== undefined && studentProfile.cgpa !== null) ? Number(studentProfile.cgpa) : user.academicDetails?.cgpa,
        activeBacklogs: Number(studentProfile.activeBacklogs || 0),
        skills: studentProfile.skills,
        certifications: studentProfile.certifications,
        resumeUrl: uploadedUrl
      });

      const updatedUser = { ...updatedUserRes.data, token: user?.token || localStorage.getItem('token') };
      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success("Resume PDF uploaded to Cloudinary & saved to profile!");
      setProfileResumeFile(null);
      fetchData();
      return uploadedUrl;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload resume file");
    } finally {
      setIsUploadingProfileResume(false);
    }
  };

  // ================= ADMIN & COMPANY HANDLERS =================
  const handleCreateDrive = async (e) => {
    e.preventDefault();
    const validation = validateDrive(newDrive);
    if (!validation.isValid) {
      setDriveErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setDriveErrors({});

    try {
      const res = await API.post('/drives', newDrive);
      toast.success('Placement Drive Created Successfully!');
      setDrives([res.data, ...drives]);
      setNewDrive({ name: '', description: '', academicYear: '2025-2026', startDate: '', endDate: '', status: 'Active' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create drive');
    }
  };

  const handleOpenEditDrive = (drive) => {
    setEditingDrive({
      _id: drive._id,
      name: drive.name || '',
      description: drive.description || '',
      academicYear: drive.academicYear || '2025-2026',
      startDate: drive.startDate ? new Date(drive.startDate).toISOString().split('T')[0] : '',
      endDate: drive.endDate ? new Date(drive.endDate).toISOString().split('T')[0] : '',
      status: drive.status || 'Active'
    });
    setEditDriveErrors({});
    setShowEditDriveModal(true);
  };

  const handleSaveEditDrive = async (e) => {
    e.preventDefault();
    if (!editingDrive) return;

    const validation = validateDrive(editingDrive);
    if (!validation.isValid) {
      setEditDriveErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setEditDriveErrors({});

    setIsSavingDrive(true);
    try {
      const res = await API.put(`/drives/${editingDrive._id}`, editingDrive);
      setDrives(drives.map(d => d._id === editingDrive._id ? res.data : d));
      toast.success('Placement Drive updated successfully!');
      setShowEditDriveModal(false);
      setEditingDrive(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update placement drive');
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleUpdateDriveStatus = async (driveId, newStatus) => {
    try {
      const res = await API.put(`/drives/${driveId}`, { status: newStatus });
      setDrives(drives.map(d => d._id === driveId ? res.data : d));
      toast.success(`Drive status updated to ${newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update drive status');
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm("Are you sure you want to delete this placement drive? All associated postings will remain linked.")) return;
    try {
      await API.delete(`/drives/${driveId}`);
      setDrives(drives.filter(d => d._id !== driveId));
      toast.success("Placement drive removed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete drive");
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    const validation = validateJob(newJob);
    if (!validation.isValid) {
      setJobErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setJobErrors({});

    const formattedJob = {
      ...newJob,
      eligibility: {
        minCgpa: Number(newJob.minCgpa || 0),
        maxBacklogs: Number(newJob.maxBacklogs || 0),
        targetGraduationYear: Number(newJob.targetGraduationYear || 2026),
        allowedDepartments: Array.isArray(newJob.allowedDepartments) 
          ? newJob.allowedDepartments 
          : String(newJob.allowedDepartments).split(',').map(d => d.trim()).filter(Boolean)
      }
    };

    try {
      const res = await API.post('/jobs', formattedJob);
      toast.success('Position successfully posted within Placement Drive!');
      setJobs([res.data, ...jobs]);
      navigate('/dashboard/jobs');
      setNewJob({
        title: '', description: '', requirements: '', location: '', salary: '', 
        drive: '', minCgpa: 0, maxBacklogs: 0, allowedDepartments: [], targetGraduationYear: 2026
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post position');
    }
  };

  const handleOpenEditJob = (job) => {
    const rawAllowed = job.eligibility?.allowedDepartments || [];
    setEditingJob({
      _id: job._id,
      title: job.title || '',
      description: job.description || '',
      requirements: job.requirements || '',
      location: job.location || '',
      salary: job.salary || '',
      drive: (typeof job.drive === 'object' ? job.drive?._id : job.drive) || '',
      minCgpa: job.eligibility?.minCgpa !== undefined ? job.eligibility.minCgpa : 0,
      maxBacklogs: job.eligibility?.maxBacklogs !== undefined ? job.eligibility.maxBacklogs : 0,
      allowedDepartments: Array.isArray(rawAllowed) ? rawAllowed : String(rawAllowed).split(',').map(d => d.trim()).filter(Boolean),
      targetGraduationYear: job.eligibility?.targetGraduationYear || 2026
    });
    setEditJobErrors({});
    setShowEditJobModal(true);
  };

  const handleSaveEditJob = async (e) => {
    e.preventDefault();
    if (!editingJob) return;

    const validation = validateJob(editingJob);
    if (!validation.isValid) {
      setEditJobErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setEditJobErrors({});

    setIsSavingJob(true);
    try {
      const payload = {
        title: editingJob.title,
        description: editingJob.description,
        requirements: editingJob.requirements,
        location: editingJob.location,
        salary: editingJob.salary,
        drive: editingJob.drive,
        eligibility: {
          minCgpa: Number(editingJob.minCgpa || 0),
          maxBacklogs: Number(editingJob.maxBacklogs || 0),
          allowedDepartments: editingJob.allowedDepartments,
          targetGraduationYear: Number(editingJob.targetGraduationYear || 2026)
        }
      };

      const res = await API.put(`/jobs/${editingJob._id}`, payload);
      setJobs(jobs.map(j => j._id === editingJob._id ? res.data : j));
      toast.success('Job position updated successfully!');
      setShowEditJobModal(false);
      setEditingJob(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update job position');
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Remove this job position? Existing submitted applications will remain intact.")) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter(j => j._id !== jobId));
      toast.success("Position successfully removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove position");
    }
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      const res = await API.put(`/applications/${appId}/status`, { status: newStatus });
      setApplications(applications.map(app => app._id === appId ? res.data : app));
      toast.success(`Application status updated to "${newStatus}"`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update application status");
    }
  };

  const handleOpenInterviewModal = (app) => {
    setSelectedAppForInterview(app);
    setInterviewDetails({
      date: app.interviewDate || '',
      time: app.interviewTime || '',
      link: app.interviewLink || '',
      stage: (app.status === 'Applied' || app.status === 'Reviewed' || app.status === 'Shortlisted') ? 'Technical Interview' : app.status
    });
    setInterviewErrors({});
    setShowInterviewModal(true);
  };

  const handleSaveInterviewSchedule = async (e) => {
    e.preventDefault();
    if (!selectedAppForInterview) return;

    const validation = validateInterview(interviewDetails);
    if (!validation.isValid) {
      setInterviewErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setInterviewErrors({});

    try {
      const res = await API.put(`/applications/${selectedAppForInterview._id}/status`, {
        status: interviewDetails.stage,
        interviewDate: interviewDetails.date,
        interviewTime: interviewDetails.time,
        interviewLink: interviewDetails.link || ''
      });
      setApplications(applications.map(app => app._id === selectedAppForInterview._id ? res.data : app));
      toast.success("Interview scheduled and candidate notified!");
      setShowInterviewModal(false);
      setSelectedAppForInterview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to schedule interview");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const validation = validateStudentProfile(studentProfile);
    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setProfileErrors({});

    try {
      const payload = {
        department: studentProfile.department,
        graduationYear: Number(studentProfile.graduationYear),
        cgpa: (studentProfile.cgpa !== '' && studentProfile.cgpa !== undefined && studentProfile.cgpa !== null) ? Number(studentProfile.cgpa) : null,
        activeBacklogs: Number(studentProfile.activeBacklogs || 0),
        skills: studentProfile.skills,
        certifications: studentProfile.certifications,
        resumeUrl: studentProfile.resumeUrl || user.academicDetails?.resumeUrl || ''
      };
      const res = await API.put('/users/profile', payload);
      toast.success("Academic Profile saved successfully!");
      const updatedUser = { ...res.data, token: user?.token || localStorage.getItem('token') };
      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save academic profile");
    }
  };

  const handleSaveQuickProfile = async (e) => {
    e.preventDefault();
    const validation = validateStudentProfile({
      ...quickProfileData,
      resumeUrl: quickProfileData.resumeUrl || (quickResumeFile ? 'pending_upload' : '')
    });
    if (!validation.isValid && !quickResumeFile) {
      setQuickProfileErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setQuickProfileErrors({});

    try {
      setIsQuickSaving(true);
      let uploadedResumeUrl = quickProfileData.resumeUrl || studentProfile.resumeUrl || user.academicDetails?.resumeUrl || '';

      if (quickResumeFile) {
        const formData = new FormData();
        formData.append('resume', quickResumeFile);
        const uploadRes = await API.post('/upload', formData);
        uploadedResumeUrl = uploadRes.data.resumeUrl;
      }

      if (!uploadedResumeUrl) {
        setIsQuickSaving(false);
        return toast.error("Please upload a PDF resume or provide a resume link");
      }

      const payload = {
        department: quickProfileData.department,
        graduationYear: Number(quickProfileData.graduationYear),
        cgpa: Number(quickProfileData.cgpa),
        activeBacklogs: Number(quickProfileData.activeBacklogs || 0),
        skills: studentProfile.skills || user.academicDetails?.skills || '',
        certifications: studentProfile.certifications || user.academicDetails?.certifications || '',
        resumeUrl: uploadedResumeUrl
      };

      const res = await API.put('/users/profile', payload);
      toast.success("Academic Profile configured successfully!");
      const updatedUser = { ...res.data, token: user?.token || localStorage.getItem('token') };
      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowQuickProfileModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save profile details");
    } finally {
      setIsQuickSaving(false);
    }
  };

  const handleWithdrawApplication = async (appId) => {
    if (!window.confirm("Withdraw your application from this position? The status will update to Withdrawn and be retained in your history.")) return;
    try {
      const res = await API.delete(`/applications/${appId}`);
      const updatedApp = res.data?.application;
      setApplications(applications.map(app => app._id === appId ? (updatedApp || { ...app, status: 'Withdrawn' }) : app));
      toast.success("Application marked as Withdrawn. Historical record preserved!");
    } catch (error) {
      toast.error("Failed to withdraw application");
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!selectedJobForApply) return;
    
    // Eligibility verification double-check
    const eligibilityResult = checkEligibility(selectedJobForApply);
    if (!eligibilityResult.eligible) {
      toast.error(`Ineligible to apply: ${eligibilityResult.reasons.join(' | ')}`);
      return;
    }

    setIsApplying(true);
    try {
      let finalResumeUrl = studentProfile.resumeUrl || user.academicDetails?.resumeUrl;
      
      if (resumeFile) {
        const formData = new FormData();
        formData.append('resume', resumeFile);
        const uploadRes = await API.post('/upload', formData);
        finalResumeUrl = uploadRes.data.resumeUrl;

        // Auto update student profile resume URL
        try {
          const profileRes = await API.put('/users/profile', {
            department: studentProfile.department || user.academicDetails?.department,
            graduationYear: Number(studentProfile.graduationYear || user.academicDetails?.graduationYear || 2026),
            cgpa: studentProfile.cgpa !== '' ? Number(studentProfile.cgpa) : user.academicDetails?.cgpa,
            activeBacklogs: Number(studentProfile.activeBacklogs || 0),
            skills: studentProfile.skills,
            certifications: studentProfile.certifications,
            resumeUrl: finalResumeUrl 
          });
          const updatedUser = { ...profileRes.data, token: user?.token || localStorage.getItem('token') };
          if (setUser) setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch(e) {
          console.warn("Could not auto-update profile resume URL", e);
        }
      }

      if (!finalResumeUrl) {
        setIsApplying(false);
        return toast.error("Please select a PDF resume file to upload");
      }

      const res = await API.post('/applications', { 
        jobId: selectedJobForApply._id, 
        resumeUrl: finalResumeUrl 
      });
      
      setApplications([res.data, ...applications]);
      toast.success('Successfully applied to position within placement drive!');
      setSelectedJobForApply(null);
      setResumeFile(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  const hasApplied = (jobId) => applications.some(app => (typeof app.job === 'object' ? app.job?._id : app.job) === jobId);

  // Status Styling Helper
  const getStatusStyle = (status) => {
    switch(status) {
      case 'Applied': return 'bg-blue-900/50 text-blue-300 border-blue-800';
      case 'Shortlisted': return 'bg-purple-900/50 text-purple-300 border-purple-800';
      case 'Assessment Round': return 'bg-yellow-900/50 text-yellow-300 border-yellow-800';
      case 'Technical Interview': return 'bg-cyan-900/50 text-cyan-300 border-cyan-800';
      case 'HR Interview': return 'bg-indigo-900/50 text-indigo-300 border-indigo-800';
      case 'Selected': 
      case 'Hired': return 'bg-green-900/50 text-green-300 border-green-800';
      case 'Rejected': return 'bg-red-900/50 text-red-300 border-red-800';
      case 'Terminated': return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'Withdrawn': return 'bg-gray-800 text-gray-400 border-gray-700';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  // Filter Data by Selected Placement Drive
  const filteredJobsByDrive = useMemo(() => {
    if (selectedDriveFilter === 'ALL') return jobs;
    return jobs.filter(j => (typeof j.drive === 'object' ? j.drive?._id : j.drive) === selectedDriveFilter);
  }, [jobs, selectedDriveFilter]);

  const filteredAppsByDrive = useMemo(() => {
    if (selectedDriveFilter === 'ALL') return applications;
    return applications.filter(app => {
      const driveId = typeof app.drive === 'object' ? app.drive?._id : (app.drive || app.job?.drive?._id || app.job?.drive);
      return driveId === selectedDriveFilter;
    });
  }, [applications, selectedDriveFilter]);

  // Analytics Computation
  const selectedCount = filteredAppsByDrive.filter(app => app.status === 'Selected' || app.status === 'Hired').length;
  const activeCount = filteredAppsByDrive.filter(app => app.status !== 'Terminated' && app.status !== 'Withdrawn').length;
  const placementPercentage = activeCount > 0 
    ? Math.round((selectedCount / activeCount) * 100) 
    : (filteredAppsByDrive.length > 0 ? Math.round((selectedCount / filteredAppsByDrive.length) * 100) : 0);

  // Department-wise Stats for Overview charts
  const deptStats = useMemo(() => {
    const deptMap = {};
    filteredAppsByDrive.forEach(app => {
      const studentDept = app.student?.academicDetails?.department || 'Unspecified';
      if (!deptMap[studentDept]) {
        deptMap[studentDept] = { department: studentDept, applications: 0, selected: 0 };
      }
      deptMap[studentDept].applications += 1;
      if (app.status === 'Selected' || app.status === 'Hired') {
        deptMap[studentDept].selected += 1;
      }
    });
    return Object.values(deptMap);
  }, [filteredAppsByDrive]);

  // Helper to get participating organizations for a drive
  const getParticipatingCompaniesForDrive = (driveId) => {
    const driveJobs = jobs.filter(j => (typeof j.drive === 'object' ? j.drive?._id : j.drive) === driveId);
    const companyNames = [...new Set(driveJobs.map(j => j.company?.name).filter(Boolean))];
    return companyNames;
  };

  // Stage Breakdown Stats
  const stageStats = useMemo(() => {
    const stageMap = {};
    filteredAppsByDrive.forEach(app => {
      stageMap[app.status] = (stageMap[app.status] || 0) + 1;
    });
    return Object.keys(stageMap).map(stage => ({ name: stage, count: stageMap[stage] }));
  }, [filteredAppsByDrive]);

  const COLORS = ['#3b82f6', '#a855f7', '#eab308', '#06b6d4', '#6366f1', '#22c55e', '#ef4444'];

  const searchFilteredJobs = filteredJobsByDrive.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (job.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Department Pill Toggle Handler for Job Creation
  const handleToggleDepartmentInNewJob = (deptName) => {
    setNewJob(prev => {
      const current = Array.isArray(prev.allowedDepartments) ? prev.allowedDepartments : [];
      if (current.includes(deptName)) {
        return { ...prev, allowedDepartments: current.filter(d => d !== deptName) };
      } else {
        return { ...prev, allowedDepartments: [...current, deptName] };
      }
    });
  };

  // Department Pill Toggle Handler for Job Editing
  const handleToggleDepartmentInEditJob = (deptName) => {
    setEditingJob(prev => {
      const current = Array.isArray(prev.allowedDepartments) ? prev.allowedDepartments : [];
      if (current.includes(deptName)) {
        return { ...prev, allowedDepartments: current.filter(d => d !== deptName) };
      } else {
        return { ...prev, allowedDepartments: [...current, deptName] };
      }
    });
  };

  if (loading) return <div className="text-center mt-20 text-gray-400 font-medium text-lg">Loading Placement Portal...</div>;

  return (
    <div className="space-y-6 pb-12">
      
      {/* DRIVE FILTER & SUB-NAVIGATION HEADER */}
      <div className="bg-gray-800/80 backdrop-blur-md p-4 rounded-2xl border border-gray-700/80 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">College Placement System</h2>
            <p className="text-xs text-gray-400">Workflow: Placement Drive &rarr; Organization &rarr; Position &rarr; Multi-Round Evaluation</p>
          </div>
        </div>

        {/* Global Drive Filter & Bulk Import (Admin) */}
        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'admin' && (
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>📥 Bulk Import Students (CSV)</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase text-gray-400 whitespace-nowrap">Filter Drive:</label>
            <select 
              value={selectedDriveFilter} 
              onChange={(e) => setSelectedDriveFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-blue-500/40 rounded-xl text-white text-xs outline-none focus:border-blue-500"
            >
              <option value="ALL">🌐 All Placement Drives ({drives.length})</option>
              {drives.map(d => (
                <option key={d._id} value={d._id}>🎯 {d.name} ({d.academicYear || 'Active'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button 
          onClick={() => navigate('/dashboard')} 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          📊 Overview
        </button>

        {/* Dedicated Department Placements Tab (Available to All Roles) */}
        <button 
          onClick={() => navigate('/dashboard/departments')} 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'departments' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          🏛️ Department Placements
        </button>

        {/* Dedicated Communication Hub Tab (Available to All Roles) */}
        <button 
          onClick={() => navigate('/dashboard/communication')} 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'communication' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          📢 Communication Hub
        </button>

        {user.role === 'admin' && (
          <>
            <button 
              onClick={() => navigate('/dashboard/drives')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'drives' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              🏛️ Placement Drives
            </button>
            <button 
              onClick={() => navigate('/dashboard/jobs')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'jobs' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              💼 Manage Positions
            </button>
            <button 
              onClick={() => navigate('/dashboard/applications')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'applications' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              📋 All Applications
            </button>
            <button 
              onClick={() => navigate('/dashboard/analytics')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              📈 Analytics
            </button>
          </>
        )}

        {user.role === 'company' && (
          <>
            <button 
              onClick={() => navigate('/dashboard/post')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'post' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              ➕ Create Position
            </button>
            <button 
              onClick={() => navigate('/dashboard/jobs')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'jobs' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              💼 Our Postings
            </button>
            <button 
              onClick={() => navigate('/dashboard/applications')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'applications' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              👥 Candidate Pipeline
            </button>
            <button 
              onClick={() => navigate('/dashboard/analytics')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              📈 Drive Reports
            </button>
          </>
        )}

        {user.role === 'student' && (
          <>
            <button 
              onClick={() => navigate('/dashboard/opportunities')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'opportunities' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              🔍 Placement Drives & Roles
            </button>
            <button 
              onClick={() => navigate('/dashboard/applications')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'applications' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              📄 My Applications
            </button>
            <button 
              onClick={() => navigate('/dashboard/profile')} 
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'profile' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              🎓 Academic Profile
            </button>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/*              DEPARTMENT PLACEMENTS VIEW                   */}
      {/* ========================================================= */}
      {currentView === 'departments' && (
        <DepartmentAnalytics 
          applications={applications} 
          jobs={jobs} 
          drives={drives} 
          selectedDriveId={selectedDriveFilter} 
        />
      )}

      {/* ========================================================= */}
      {/*                COMMUNICATION HUB VIEW                     */}
      {/* ========================================================= */}
      {currentView === 'communication' && (
        <CommunicationCenter 
          user={user} 
          jobs={jobs} 
          drives={drives} 
        />
      )}

      {/* ========================================================= */}
      {/*                       STUDENT VIEWS                       */}
      {/* ========================================================= */}
      {user.role === 'student' && currentView !== 'departments' && currentView !== 'communication' && (
        <div className="space-y-8">
          
          {/* PROFILE INCOMPLETE WARNING BANNER */}
          {getMissingAcademicFields(user).length > 0 && (
            <div className="bg-gradient-to-r from-yellow-950/80 to-red-950/50 border border-yellow-600/60 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-900/40 rounded-xl text-yellow-400 shrink-0 mt-1 md:mt-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Action Required: Configure Academic Profile
                  </h3>
                  <p className="text-gray-300 text-sm mt-1">
                    Your profile is incomplete. To apply for placement drive opportunities, please configure the following missing item(s):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {getMissingAcademicFields(user).map(field => (
                      <span key={field} className="px-3 py-1 bg-red-900/70 text-red-300 border border-red-700/80 rounded-lg text-xs font-bold flex items-center gap-1">
                        ⚠️ Missing: {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => navigate('/dashboard/profile')} className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl whitespace-nowrap transition-colors shadow-lg shrink-0">
                Configure Profile &rarr;
              </button>
            </div>
          )}

          {/* OVERVIEW */}
          {currentView === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400 text-2xl">🏛️</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Active Drives</p><h3 className="text-3xl font-bold text-white">{drives.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400 text-2xl">📋</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">My Applications</p><h3 className="text-3xl font-bold text-white">{applications.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-green-900/30 text-green-400 text-2xl">🎉</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Offers Received</p><h3 className="text-3xl font-bold text-white">{selectedCount}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-cyan-900/30 text-cyan-400 text-2xl">⭐</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Your CGPA</p><h3 className="text-3xl font-bold text-white">{user.academicDetails?.cgpa || 'N/A'}</h3></div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => navigate('/dashboard/opportunities')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-blue-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Explore Drive Roles &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Browse open positions and verify your eligibility criteria in real time.</p>
                </button>
                <button onClick={() => navigate('/dashboard/applications')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-purple-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Track Applications & Rounds &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">View step-by-step round feedback, scores, interview invites, and offers.</p>
                </button>
                <button onClick={() => navigate('/dashboard/profile')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-green-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Update Academic Profile &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Keep your department, CGPA, skills, and Cloudinary PDF resume updated.</p>
                </button>
              </div>
            </div>
          )}

          {/* STUDENT ACADEMIC PROFILE TAB */}
          {currentView === 'profile' && (
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl max-w-3xl mx-auto animate-fade-in">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-white">Student Academic Profile</h2>
                  <p className="text-gray-400 text-sm">Required for Placement Drive eligibility verification and drive reporting</p>
                </div>
                <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-xs font-semibold rounded-full border border-blue-800">
                  Graduation Year: {studentProfile.graduationYear || 2026}
                </span>
              </div>

              {/* Profile Completion Checklist */}
              <div className="mb-6 p-4 rounded-xl border bg-gray-900/60 border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-gray-400">Profile Completion Status</span>
                  <span className="text-xs font-bold text-blue-400">
                    {4 - getMissingAcademicFields(user).length} of 4 Core Details Configured
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${studentProfile.department ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                    {studentProfile.department ? '✓ Department' : '✕ Missing Department'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${studentProfile.cgpa !== '' && studentProfile.cgpa !== undefined ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                    {studentProfile.cgpa !== '' && studentProfile.cgpa !== undefined ? '✓ CGPA' : '✕ Missing CGPA'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${studentProfile.graduationYear ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                    {studentProfile.graduationYear ? '✓ Graduation Year' : '✕ Missing Graduation Year'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${studentProfile.resumeUrl ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
                    {studentProfile.resumeUrl ? '✓ Resume PDF' : '✕ Missing Resume PDF'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Standardized Department Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Department / College Program</span>
                      {!studentProfile.department && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                    </label>
                    <select 
                      required 
                      value={studentProfile.department} 
                      onChange={(e) => setStudentProfile({...studentProfile, department: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="">-- Select Standard Department --</option>
                      {DEPARTMENT_OPTIONS.map(d => (
                        <option key={d.code} value={d.value}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                    {profileErrors.department && <p className="text-xs text-red-400 mt-1">{profileErrors.department}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Graduation Year</span>
                      {!studentProfile.graduationYear && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                    </label>
                    <input 
                      type="number" 
                      required 
                      value={studentProfile.graduationYear} 
                      onChange={(e) => setStudentProfile({...studentProfile, graduationYear: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Cumulative CGPA (0.0 - 10.0)</span>
                      {(studentProfile.cgpa === '' || studentProfile.cgpa === undefined) && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      max="10"
                      min="0"
                      required 
                      value={studentProfile.cgpa} 
                      onChange={(e) => setStudentProfile({...studentProfile, cgpa: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Active Backlogs Count</label>
                    <input 
                      type="number" 
                      min="0" 
                      required 
                      value={studentProfile.activeBacklogs} 
                      onChange={(e) => setStudentProfile({...studentProfile, activeBacklogs: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Technical Skills (Comma Separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. React, Node.js, Python, Java, SQL"
                      value={studentProfile.skills} 
                      onChange={(e) => setStudentProfile({...studentProfile, skills: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Certifications (Comma Separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AWS Certified Cloud Practitioner, NPTEL Algorithms"
                      value={studentProfile.certifications} 
                      onChange={(e) => setStudentProfile({...studentProfile, certifications: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                    />
                  </div>

                  {/* RESUME CLOUDINARY UPLOAD CONTAINER */}
                  <div className="bg-gray-900/80 p-5 rounded-2xl border border-gray-700/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-blue-400 flex items-center gap-2">
                        <span>Upload Academic Resume (PDF File &rarr; Cloudinary)</span>
                        {!studentProfile.resumeUrl && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                      </label>
                      {studentProfile.resumeUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewResume({
                              url: studentProfile.resumeUrl,
                              studentName: user.name,
                              positionTitle: 'Student Academic Profile'
                            });
                            setShowResumeModal(true);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1"
                        >
                          📄 View Current Resume
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleUploadProfileResume(file);
                        }} 
                        disabled={isUploadingProfileResume}
                        className="w-full bg-gray-800 p-2.5 rounded-xl text-gray-300 text-xs border border-gray-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer disabled:opacity-50" 
                      />
                    </div>
                    {isUploadingProfileResume && (
                      <p className="text-xs text-blue-400 font-semibold animate-pulse">Streaming PDF Resume to Cloudinary Storage...</p>
                    )}
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Permanent Resume URL (Cloud Hosted)</label>
                      <input 
                        type="url" 
                        placeholder="https://res.cloudinary.com/.../resume.pdf"
                        value={studentProfile.resumeUrl} 
                        onChange={(e) => setStudentProfile({...studentProfile, resumeUrl: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors">
                  Save Academic Profile
                </button>
              </form>
            </div>
          )}

          {/* OPEN POSITIONS & REAL-TIME ELIGIBILITY ENGINE */}
          {currentView === 'opportunities' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Placement Drive Positions</h2>
                  <p className="text-gray-400 text-sm">Positions created by organizations participating in placement drives</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Search by title, department, or company..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full md:w-80 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500 text-sm" 
                />
              </div>

              {searchFilteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-lg">No positions match the selected Placement Drive or search criteria.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {searchFilteredJobs.map((job) => {
                    const eligibilityResult = checkEligibility(job);
                    const applied = hasApplied(job._id);

                    return (
                      <div key={job._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between hover:border-gray-500 transition-all shadow-lg space-y-4">
                        <div>
                          {/* Placement Drive Tag */}
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-950 text-blue-300 rounded-lg border border-blue-800">
                              🎯 {job.drive?.name || 'Campus Drive'}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded">
                              Grad Year: {job.eligibility?.targetGraduationYear || 'Any'}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white line-clamp-1">{job.title}</h3>
                          <p className="text-blue-400 text-sm font-semibold mb-2">{job.company?.name || 'Participating Company'}</p>
                          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{job.description}</p>

                          {/* Eligibility Criteria Breakdown */}
                          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 mb-2 space-y-1 text-xs">
                            <p className="text-gray-300 font-semibold mb-1">Eligibility Criteria:</p>
                            <div className="flex justify-between text-gray-400">
                              <span>Min CGPA:</span>
                              <span className="font-semibold text-gray-200">{job.eligibility?.minCgpa || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Max Backlogs:</span>
                              <span className="font-semibold text-gray-200">{job.eligibility?.maxBacklogs ?? 0}</span>
                            </div>
                            {job.eligibility?.allowedDepartments?.length > 0 && (
                              <div className="text-gray-400">
                                <span>Eligible Depts:</span>
                                <p className="font-medium text-blue-300 line-clamp-1">{job.eligibility.allowedDepartments.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Real-time Eligibility Status Badge */}
                        <div className="space-y-3 pt-3 border-t border-gray-700">
                          {eligibilityResult.eligible ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-950/60 px-3 py-1 rounded-full border border-green-800/80">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              Eligible to Apply
                            </span>
                          ) : (
                            <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-800/50 text-xs text-red-300">
                              <p className="font-bold flex items-center gap-1 text-red-400">
                                ✕ Ineligible Criteria:
                              </p>
                              <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-300">
                                {eligibilityResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}

                          {eligibilityResult.eligible ? (
                            <button 
                              onClick={() => setSelectedJobForApply(job)} 
                              disabled={applied} 
                              className={`w-full font-bold py-3 rounded-xl transition-all shadow-md ${
                                applied 
                                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                              }`}
                            >
                              {applied ? '✓ Applied' : 'Apply for Position'}
                            </button>
                          ) : getMissingAcademicFields(user).length > 0 ? (
                            <button 
                              onClick={() => {
                                setQuickProfileData({
                                  department: studentProfile.department || user.academicDetails?.department || '',
                                  graduationYear: studentProfile.graduationYear || user.academicDetails?.graduationYear || 2026,
                                  cgpa: studentProfile.cgpa !== '' ? studentProfile.cgpa : (user.academicDetails?.cgpa !== undefined ? user.academicDetails.cgpa : ''),
                                  activeBacklogs: studentProfile.activeBacklogs !== undefined ? studentProfile.activeBacklogs : (user.academicDetails?.activeBacklogs || 0),
                                  resumeUrl: studentProfile.resumeUrl || user.academicDetails?.resumeUrl || ''
                                });
                                setShowQuickProfileModal(true);
                              }}
                              className="w-full bg-yellow-600 hover:bg-yellow-500 text-gray-950 font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 text-xs"
                            >
                              ⚡ Fill Missing Profile Details to Apply
                            </button>
                          ) : (
                            <button 
                              disabled 
                              className="w-full bg-gray-800 text-gray-500 border border-gray-700 font-bold py-3 rounded-xl cursor-not-allowed text-xs"
                            >
                              Ineligible to Apply
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* APPLICATION TRACKER WITH ROUND EVALUATION FEEDBACK */}
          {currentView === 'applications' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Application Pipeline & Round Progress</h3>
                  <p className="text-gray-400 text-xs">Track real-time evaluation scores, stage feedback, and interview schedules</p>
                </div>
                <span className="text-xs px-3 py-1 bg-blue-950 text-blue-300 rounded-xl border border-blue-800 font-bold">
                  {filteredAppsByDrive.length} Application(s)
                </span>
              </div>
              
              {filteredAppsByDrive.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-700">
                  <p className="text-gray-400">No applications submitted for the selected Placement Drive yet.</p>
                  <button onClick={() => navigate('/dashboard/opportunities')} className="mt-4 text-blue-400 hover:text-blue-300 font-semibold text-sm">Browse Open Placement Positions &rarr;</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredAppsByDrive.map((app) => (
                    <div key={app._id} className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl space-y-4">
                      <div className="flex flex-wrap justify-between items-start gap-4 border-b border-gray-700 pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-950 text-blue-300 rounded-md border border-blue-800">
                              🎯 {app.drive?.name || app.job?.drive?.name || 'Campus Drive'}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-xl font-bold text-white">{app.job?.title || 'Position'}</h4>
                          <p className="text-blue-400 font-semibold text-sm">{app.job?.company?.name || 'Recruiting Company'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${getStatusStyle(app.status)}`}>
                            {app.status}
                          </span>

                          {app.status !== 'Selected' && app.status !== 'Hired' && app.status !== 'Withdrawn' && (
                            <button 
                              onClick={() => handleWithdrawApplication(app._id)} 
                              className="text-red-400 hover:text-red-300 font-semibold bg-red-950/40 border border-red-800/50 px-3 py-1.5 rounded-xl text-xs transition-colors"
                            >
                              Withdraw Application
                            </button>
                          )}
                          {app.status === 'Withdrawn' && (
                            <span className="text-xs px-3 py-1 bg-gray-900 text-gray-400 rounded-xl border border-gray-700">
                              Application Withdrawn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Interview Banner */}
                      {(app.status === 'Technical Interview' || app.status === 'HR Interview' || app.status === 'Interview Scheduled') && app.interviewDate && (
                        <div className="p-4 bg-indigo-950/60 border border-indigo-700/80 rounded-xl text-xs text-indigo-200 flex flex-wrap justify-between items-center gap-3">
                          <div>
                            <p className="font-bold text-white text-sm mb-0.5">📅 Interview Scheduled: {app.interviewDate} at {app.interviewTime}</p>
                            <p className="text-indigo-300">Please be present 5 minutes before your scheduled slot.</p>
                          </div>
                          {app.interviewLink && (
                            <a 
                              href={app.interviewLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
                            >
                              Join Video Meeting &rarr;
                            </a>
                          )}
                        </div>
                      )}

                      {/* Round-by-Round Feedback Timeline */}
                      <RoundTimelineCard application={app} isRecruiter={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/*                        ADMIN VIEWS                        */}
      {/* ========================================================= */}
      {user.role === 'admin' && currentView !== 'departments' && currentView !== 'communication' && (
        <div className="space-y-8">
          
          {/* OVERVIEW */}
          {currentView === 'overview' && (
            <div className="animate-fade-in space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <button onClick={() => navigate('/dashboard/drives')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-blue-500 transition-all flex items-center gap-4 group shadow-lg">
                  <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors text-2xl">🏛️</div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Placement Drives</p><h3 className="text-3xl font-bold text-white">{drives.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/jobs')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-purple-500 transition-all flex items-center gap-4 group shadow-lg">
                  <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors text-2xl">💼</div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Drive Positions</p><h3 className="text-3xl font-bold text-white">{jobs.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/applications')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-yellow-500 transition-all flex items-center gap-4 group shadow-lg">
                  <div className="p-4 rounded-xl bg-yellow-900/30 text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white transition-colors text-2xl">📋</div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Total Applications</p><h3 className="text-3xl font-bold text-white">{applications.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/departments')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-green-500 transition-all flex items-center gap-4 group shadow-lg">
                  <div className="p-4 rounded-xl bg-green-900/30 text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors text-2xl">🎉</div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Placement Outcome</p><h3 className="text-3xl font-bold text-white">{placementPercentage}%</h3></div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <span>📥 Bulk Import Students from CSV</span>
                </button>
                <button
                  onClick={() => exportDriveReportCSV(drives, jobs, applications, selectedDriveFilter)}
                  className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500/40 font-bold rounded-2xl text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <span>📊 Export Complete Drive Report (CSV)</span>
                </button>
              </div>

              {/* Quick Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h3 className="text-xl font-bold text-white mb-6">Recruitment Stage Distribution</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stageStats} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="count">
                          {stageStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h3 className="text-xl font-bold text-white mb-6">Department-wise Selection Breakdown</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="department" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#9ca3af" allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} cursor={{fill: '#374151', opacity: 0.4}} />
                        <Bar dataKey="applications" fill="#3b82f6" name="Applications" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="selected" fill="#22c55e" name="Selected/Hired" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PLACEMENT DRIVE MANAGEMENT */}
          {currentView === 'drives' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4">Initialize Placement Drive</h3>
                <form onSubmit={handleCreateDrive} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <input 
                      type="text" 
                      required 
                      placeholder="Drive Name (e.g. Campus Placement Drive 2026)" 
                      value={newDrive.name} 
                      onChange={(e) => {
                        setNewDrive({...newDrive, name: e.target.value});
                        if (driveErrors.name) setDriveErrors(prev => ({...prev, name: null}));
                      }} 
                      className={`w-full px-4 py-2.5 bg-gray-900/60 border rounded-xl text-white outline-none focus:border-blue-500 ${driveErrors.name ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {driveErrors.name && <p className="text-red-400 text-xs mt-1">{driveErrors.name}</p>}
                  </div>

                  <div>
                    <input 
                      type="text" 
                      placeholder="Academic Year (e.g. 2025-2026)" 
                      value={newDrive.academicYear} 
                      onChange={(e) => {
                        setNewDrive({...newDrive, academicYear: e.target.value});
                        if (driveErrors.academicYear) setDriveErrors(prev => ({...prev, academicYear: null}));
                      }} 
                      className={`w-full px-4 py-2.5 bg-gray-900/60 border rounded-xl text-white outline-none focus:border-blue-500 ${driveErrors.academicYear ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {driveErrors.academicYear && <p className="text-red-400 text-xs mt-1">{driveErrors.academicYear}</p>}
                  </div>

                  <div>
                    <input 
                      type="text" 
                      placeholder="Description (Optional)" 
                      value={newDrive.description} 
                      onChange={(e) => setNewDrive({...newDrive, description: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={newDrive.startDate} 
                      onChange={(e) => {
                        setNewDrive({...newDrive, startDate: e.target.value});
                        if (driveErrors.startDate) setDriveErrors(prev => ({...prev, startDate: null}));
                      }} 
                      className={`w-full px-4 py-2 bg-gray-900/60 border rounded-xl text-white text-xs outline-none focus:border-blue-500 ${driveErrors.startDate ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {driveErrors.startDate && <p className="text-red-400 text-xs mt-1">{driveErrors.startDate}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">End Date</label>
                    <input 
                      type="date" 
                      min={newDrive.startDate || new Date().toISOString().split('T')[0]}
                      value={newDrive.endDate} 
                      onChange={(e) => {
                        setNewDrive({...newDrive, endDate: e.target.value});
                        if (driveErrors.endDate) setDriveErrors(prev => ({...prev, endDate: null}));
                      }} 
                      className={`w-full px-4 py-2 bg-gray-900/60 border rounded-xl text-white text-xs outline-none focus:border-blue-500 ${driveErrors.endDate ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {driveErrors.endDate && <p className="text-red-400 text-xs mt-1">{driveErrors.endDate}</p>}
                  </div>

                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-md">
                      Create Placement Drive
                    </button>
                  </div>
                </form>
              </div>

              {/* Drives List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {drives.map(drive => (
                  <div key={drive._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col justify-between hover:border-gray-600 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-white">{drive.name}</h4>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          drive.status === 'Active' ? 'bg-green-950 text-green-400 border-green-800' :
                          drive.status === 'Upcoming' ? 'bg-yellow-950 text-yellow-400 border-yellow-800' :
                          'bg-gray-900 text-gray-400 border-gray-700'
                        }`}>
                          {drive.status}
                        </span>
                      </div>
                      <p className="text-xs text-blue-400 font-semibold mb-2">Academic Year: {drive.academicYear || '2025-2026'}</p>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{drive.description || 'No description provided.'}</p>

                      {/* Participating Organizations */}
                      <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/60 mb-4 text-xs">
                        <span className="text-gray-400 font-semibold block mb-1">🏢 Participating Organizations:</span>
                        {getParticipatingCompaniesForDrive(drive._id).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {getParticipatingCompaniesForDrive(drive._id).map((c, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded font-medium border border-blue-800/60">
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No position postings yet</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700 flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={drive.status}
                          onChange={(e) => handleUpdateDriveStatus(drive._id, e.target.value)}
                          className="text-xs bg-gray-900 border border-gray-600 rounded-lg text-white px-2 py-1 outline-none"
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditDrive(drive)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1 bg-blue-950 rounded border border-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDrive(drive._id)}
                          className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-950 rounded border border-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANAGE POSITIONS (ADMIN) */}
          {currentView === 'jobs' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">All Active Position Postings</h3>
                  <p className="text-gray-400 text-xs">Manage position postings linked across placement drives</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => (
                  <div key={job._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between shadow-lg space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2.5 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800 font-semibold">
                          🎯 {job.drive?.name || 'Campus Drive'}
                        </span>
                        <span className="text-xs text-gray-400">{job.location}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{job.title}</h4>
                      <p className="text-blue-400 text-xs font-semibold mb-2">{job.company?.name || 'Organization'}</p>
                      <p className="text-gray-400 text-xs line-clamp-2 mb-3">{job.description}</p>
                      
                      <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700 text-xs space-y-1">
                        <p className="text-gray-300 font-semibold">Salary: <span className="text-green-400">{job.salary || 'Competitive'}</span></p>
                        <p className="text-gray-300">Min CGPA: <span className="text-yellow-300 font-bold">{job.eligibility?.minCgpa || 0}</span></p>
                        {job.eligibility?.allowedDepartments?.length > 0 && (
                          <p className="text-gray-400 text-[11px] line-clamp-1">
                            Depts: <strong className="text-blue-300">{job.eligibility.allowedDepartments.join(', ')}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                      <button
                        onClick={() => handleOpenEditJob(job)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Edit Position
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="px-3 py-1.5 bg-red-950 text-red-400 hover:text-red-300 border border-red-800 rounded-xl text-xs font-bold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL APPLICATIONS (ADMIN PIPELINE & EVALUATIONS) */}
          {currentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">All Candidate Applications</h3>
                  <p className="text-gray-400 text-xs">Review applicant academic credentials, Cloudinary resumes, and multi-round evaluations</p>
                </div>
                <button
                  onClick={() => exportApplicantsCSV('All_Applications', filteredAppsByDrive)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>📥 Export Applications (CSV)</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 text-gray-400 border-b border-gray-700 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5">Position / Org</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">CGPA</th>
                      <th className="p-3.5">Stage / Status</th>
                      <th className="p-3.5">Resume</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {filteredAppsByDrive.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                        <td className="p-3.5">
                          <strong className="text-white block text-sm">{app.student?.name || 'Candidate'}</strong>
                          <span className="text-gray-400">{app.student?.email}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{app.job?.title}</span>
                          <span className="text-blue-400">{app.job?.company?.name}</span>
                        </td>
                        <td className="p-3.5 font-bold text-gray-200">
                          {app.student?.academicDetails?.department || 'N/A'}
                        </td>
                        <td className="p-3.5 font-bold text-yellow-300">
                          {app.student?.academicDetails?.cgpa || 'N/A'}
                        </td>
                        <td className="p-3.5">
                          {app.status === 'Withdrawn' ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
                              Candidate Withdrawn
                            </span>
                          ) : (
                            <select
                              value={app.status}
                              onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                              className="text-xs bg-gray-900 border border-gray-600 rounded-lg text-white px-2 py-1 outline-none font-semibold"
                            >
                              {RECRUITMENT_STAGES.filter(s => s !== 'Withdrawn').map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewResume({
                                url: app.resumeUrl,
                                studentName: app.student?.name || 'Candidate',
                                positionTitle: app.job?.title || 'Position'
                              });
                              setShowResumeModal(true);
                            }}
                            className="px-2.5 py-1 bg-blue-950 text-blue-300 hover:text-white rounded-lg border border-blue-800/80 font-bold transition-colors"
                          >
                            📄 View Resume
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppForRound(app);
                              setShowRoundModal(true);
                            }}
                            className="px-2.5 py-1 bg-purple-950 text-purple-300 hover:text-white rounded-lg border border-purple-800/80 font-bold transition-colors"
                          >
                            🎯 Rounds & Feedback ({app.rounds?.length || 0})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS (ADMIN) */}
          {currentView === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Full Placement Analytics Report</h3>
                  <p className="text-gray-400 text-xs">Drive performance and organization hiring benchmarks</p>
                </div>
                <button
                  onClick={() => exportDriveReportCSV(drives, jobs, applications, selectedDriveFilter)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  📥 Export Drive Report (CSV)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4">Stage Distribution</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stageStats} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="count">
                          {stageStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4">Department Placed Stats</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="department" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Bar dataKey="selected" fill="#22c55e" name="Offers Extended" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/*                       COMPANY VIEWS                       */}
      {/* ========================================================= */}
      {user.role === 'company' && currentView !== 'departments' && currentView !== 'communication' && (
        <div className="space-y-8">
          
          {/* OVERVIEW */}
          {currentView === 'overview' && (
            <div className="animate-fade-in space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400 text-2xl">💼</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Our Active Roles</p><h3 className="text-3xl font-bold text-white">{jobs.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400 text-2xl">👥</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Total Applicants</p><h3 className="text-3xl font-bold text-white">{applications.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-yellow-900/30 text-yellow-400 text-2xl">🎯</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Shortlisted / Interviews</p><h3 className="text-3xl font-bold text-white">{applications.filter(a => ['Shortlisted', 'Assessment Round', 'Technical Interview', 'HR Interview', 'Interview Scheduled'].includes(a.status)).length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-green-900/30 text-green-400 text-2xl">🎉</div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Hired Candidates</p><h3 className="text-3xl font-bold text-white">{selectedCount}</h3></div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => navigate('/dashboard/post')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-blue-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">➕ Post New Position &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Create new hiring opportunities attached to placement drives with eligibility constraints.</p>
                </button>
                <button onClick={() => navigate('/dashboard/applications')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-purple-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">👥 Candidate Pipeline & Rounds &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Evaluate candidate resumes, score rounds, share feedback, and schedule interviews.</p>
                </button>
                <button onClick={() => navigate('/dashboard/communication')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-green-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">📢 Broadcast Candidate Alerts &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Send shortlisted announcements and interview instructions directly to candidates.</p>
                </button>
              </div>
            </div>
          )}

          {/* CREATE POSITION (COMPANY) */}
          {currentView === 'post' && (
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl max-w-3xl mx-auto animate-fade-in space-y-6">
              <div className="border-b border-gray-700 pb-4">
                <h3 className="text-2xl font-bold text-white">Create New Placement Position</h3>
                <p className="text-gray-400 text-sm">Post a job opportunity with standardized department eligibility constraints</p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1.5">Target Placement Drive</label>
                  <select 
                    required 
                    value={newJob.drive} 
                    onChange={(e) => {
                      setNewJob({...newJob, drive: e.target.value});
                      if (jobErrors.drive) setJobErrors(prev => ({...prev, drive: null}));
                    }}
                    className={`w-full px-4 py-2.5 bg-gray-900 rounded-xl text-white text-sm outline-none border focus:border-blue-500 ${jobErrors.drive ? 'border-red-500' : 'border-blue-500/50'}`}
                  >
                    <option value="">-- Select Placement Drive --</option>
                    {drives.map(d => <option key={d._id} value={d._id}>{d.name} ({d.academicYear || '2025-2026'})</option>)}
                  </select>
                  {jobErrors.drive && <p className="text-red-400 text-xs mt-1">{jobErrors.drive}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Position Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Software Development Engineer"
                      value={newJob.title} 
                      onChange={(e) => {
                        setNewJob({...newJob, title: e.target.value});
                        if (jobErrors.title) setJobErrors(prev => ({...prev, title: null}));
                      }}
                      className={`w-full px-4 py-2.5 bg-gray-900 border rounded-xl text-white text-sm outline-none focus:border-blue-500 ${jobErrors.title ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {jobErrors.title && <p className="text-red-400 text-xs mt-1">{jobErrors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Job Location</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Bangalore / Remote"
                      value={newJob.location} 
                      onChange={(e) => {
                        setNewJob({...newJob, location: e.target.value});
                        if (jobErrors.location) setJobErrors(prev => ({...prev, location: null}));
                      }}
                      className={`w-full px-4 py-2.5 bg-gray-900 border rounded-xl text-white text-sm outline-none focus:border-blue-500 ${jobErrors.location ? 'border-red-500' : 'border-gray-600'}`} 
                    />
                    {jobErrors.location && <p className="text-red-400 text-xs mt-1">{jobErrors.location}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Salary Package (CTC)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ₹9,50,000 LPA"
                      value={newJob.salary} 
                      onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-yellow-400 mb-1">Target Graduation Year</label>
                    <input 
                      type="number" 
                      required 
                      value={newJob.targetGraduationYear} 
                      onChange={(e) => setNewJob({...newJob, targetGraduationYear: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-yellow-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-yellow-400 mb-1">Minimum CGPA Required (0 - 10)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      max="10"
                      min="0"
                      required 
                      value={newJob.minCgpa} 
                      onChange={(e) => setNewJob({...newJob, minCgpa: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-yellow-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-yellow-400 mb-1">Max Active Backlogs Allowed</label>
                    <input 
                      type="number" 
                      min="0" 
                      required 
                      value={newJob.maxBacklogs} 
                      onChange={(e) => setNewJob({...newJob, maxBacklogs: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-yellow-500" 
                    />
                  </div>
                </div>

                {/* Standardized Department Checkbox Pills */}
                <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-yellow-400">Allowed College Departments</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewJob(prev => ({ ...prev, allowedDepartments: COLLEGE_DEPARTMENTS.map(d => d.name) }))}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        type="button"
                        onClick={() => setNewJob(prev => ({ ...prev, allowedDepartments: [] }))}
                        className="text-[11px] text-gray-400 hover:text-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">Click to toggle eligible department programs for this position:</p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLLEGE_DEPARTMENTS.map(dept => {
                      const isSelected = Array.isArray(newJob.allowedDepartments) && newJob.allowedDepartments.includes(dept.name);
                      return (
                        <button
                          key={dept.code}
                          type="button"
                          onClick={() => handleToggleDepartmentInNewJob(dept.name)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-400 shadow-md' 
                              : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <span>{dept.icon}</span>
                          <span>{dept.code}</span>
                          {isSelected && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Job Description & Responsibilities</label>
                  <textarea 
                    required 
                    rows="3" 
                    placeholder="Key responsibilities, team overview, and project scope..."
                    value={newJob.description} 
                    onChange={(e) => {
                      setNewJob({...newJob, description: e.target.value});
                      if (jobErrors.description) setJobErrors(prev => ({...prev, description: null}));
                    }}
                    className={`w-full px-4 py-2.5 bg-gray-900 border rounded-xl text-white text-sm outline-none focus:border-blue-500 ${jobErrors.description ? 'border-red-500' : 'border-gray-600'}`} 
                  ></textarea>
                  {jobErrors.description && <p className="text-red-400 text-xs mt-1">{jobErrors.description}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Required Tech Stack & Skills</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. React.js, Node.js, MongoDB, REST APIs, Git"
                    value={newJob.requirements} 
                    onChange={(e) => {
                      setNewJob({...newJob, requirements: e.target.value});
                      if (jobErrors.requirements) setJobErrors(prev => ({...prev, requirements: null}));
                    }}
                    className={`w-full px-4 py-2.5 bg-gray-900 border rounded-xl text-white text-sm outline-none focus:border-blue-500 ${jobErrors.requirements ? 'border-red-500' : 'border-gray-600'}`} 
                  />
                  {jobErrors.requirements && <p className="text-red-400 text-xs mt-1">{jobErrors.requirements}</p>}
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors">
                  Publish Position to Placement Drive
                </button>
              </form>
            </div>
          )}

          {/* OUR POSTINGS (COMPANY) */}
          {currentView === 'jobs' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Our Posted Positions</h3>
                  <p className="text-gray-400 text-xs">Manage your active recruitment openings</p>
                </div>
                <button
                  onClick={() => navigate('/dashboard/post')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  ➕ Post New Position
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map(job => (
                  <div key={job._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between shadow-lg space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs px-2.5 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800 font-semibold">
                          🎯 {job.drive?.name || 'Campus Drive'}
                        </span>
                        <span className="text-xs text-gray-400">{job.location}</span>
                      </div>
                      <h4 className="text-lg font-bold text-white">{job.title}</h4>
                      <p className="text-gray-400 text-xs line-clamp-2 my-2">{job.description}</p>
                      
                      <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700 text-xs space-y-1">
                        <p className="text-gray-300 font-semibold">Salary: <span className="text-green-400">{job.salary || 'Competitive'}</span></p>
                        <p className="text-gray-300">Min CGPA: <span className="text-yellow-300 font-bold">{job.eligibility?.minCgpa || 0}</span></p>
                        {job.eligibility?.allowedDepartments?.length > 0 && (
                          <p className="text-gray-400 text-[11px] line-clamp-1">
                            Depts: <strong className="text-blue-300">{job.eligibility.allowedDepartments.join(', ')}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                      <button
                        onClick={() => handleOpenEditJob(job)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Edit Position
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job._id)}
                        className="px-3 py-1.5 bg-red-950 text-red-400 hover:text-red-300 border border-red-800 rounded-xl text-xs font-bold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CANDIDATE PIPELINE & EVALUATIONS (COMPANY) */}
          {currentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Candidate Pipeline & Evaluations</h3>
                  <p className="text-gray-400 text-xs">Review candidate credentials, cloud resumes, score evaluation rounds, and schedule interviews</p>
                </div>
                <button
                  onClick={() => exportApplicantsCSV('Candidate_Pipeline', filteredAppsByDrive)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>📥 Export Candidates (CSV)</span>
                </button>
              </div>

              {filteredAppsByDrive.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs italic bg-gray-900/40 rounded-xl border border-gray-800">
                  No candidate applications received for your posted positions yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900 text-gray-400 border-b border-gray-700 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3.5">Candidate</th>
                        <th className="p-3.5">Position</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5">CGPA</th>
                        <th className="p-3.5">Stage / Status</th>
                        <th className="p-3.5">Resume</th>
                        <th className="p-3.5 text-right">Actions & Evaluations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {filteredAppsByDrive.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                          <td className="p-3.5">
                            <strong className="text-white block text-sm">{app.student?.name || 'Candidate'}</strong>
                            <span className="text-gray-400">{app.student?.email}</span>
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {app.job?.title}
                          </td>
                          <td className="p-3.5 font-bold text-blue-300">
                            {app.student?.academicDetails?.department || 'N/A'}
                          </td>
                          <td className="p-3.5 font-bold text-yellow-300">
                            {app.student?.academicDetails?.cgpa || 'N/A'}
                          </td>
                          <td className="p-3.5">
                            {/* WITHDRAWN APPLICATION GUARD: Disable modification if Withdrawn */}
                            {app.status === 'Withdrawn' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700 inline-block" title="Candidate has withdrawn this application">
                                ✕ Candidate Withdrawn
                              </span>
                            ) : (
                              <select
                                value={app.status}
                                onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                                className="text-xs bg-gray-900 border border-gray-600 rounded-lg text-white px-2 py-1 outline-none font-semibold"
                              >
                                {RECRUITMENT_STAGES.filter(s => s !== 'Withdrawn').map(stage => (
                                  <option key={stage} value={stage}>{stage}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewResume({
                                  url: app.resumeUrl,
                                  studentName: app.student?.name || 'Candidate',
                                  positionTitle: app.job?.title || 'Position'
                                });
                                setShowResumeModal(true);
                              }}
                              className="px-2.5 py-1 bg-blue-950 text-blue-300 hover:text-white rounded-lg border border-blue-800/80 font-bold transition-colors"
                            >
                              📄 Resume
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            {app.status === 'Withdrawn' ? (
                              <span className="text-[11px] text-gray-500 italic">Withdrawn by Student</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAppForRound(app);
                                    setShowRoundModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-purple-950 text-purple-300 hover:text-white rounded-lg border border-purple-800/80 font-bold transition-colors"
                                >
                                  🎯 Rounds ({app.rounds?.length || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenInterviewModal(app)}
                                  className="px-2.5 py-1 bg-indigo-950 text-indigo-300 hover:text-white rounded-lg border border-indigo-800/80 font-bold transition-colors"
                                >
                                  📅 Schedule
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DRIVE REPORTS (COMPANY) */}
          {currentView === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Recruitment Performance Report</h3>
                  <p className="text-gray-400 text-xs">Review applicant conversion funnels and interview outcomes</p>
                </div>
                <button
                  onClick={() => exportApplicantsCSV('Company_Recruitment_Report', filteredAppsByDrive)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  📥 Export Candidate Report (CSV)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4">Stage Breakdown</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stageStats} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="count">
                          {stageStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <h4 className="text-lg font-bold text-white mb-4">Department Distribution</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="department" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                        <Bar dataKey="applications" fill="#3b82f6" name="Applicants" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="selected" fill="#22c55e" name="Hired" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/*                       SHARED MODALS                       */}
      {/* ========================================================= */}

      {/* APPLY FOR POSITION MODAL */}
      {selectedJobForApply && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-blue-500/50 rounded-2xl w-full max-w-lg shadow-2xl p-6 md:p-8 space-y-5 my-auto">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Apply for Position</h3>
                <p className="text-xs text-blue-400 font-semibold">{selectedJobForApply.title} - {selectedJobForApply.company?.name}</p>
              </div>
              <button 
                onClick={() => { setSelectedJobForApply(null); setResumeFile(null); }}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-xs space-y-2 text-gray-300">
              <p className="font-bold text-white text-sm mb-1">Academic Credentials to be Shared:</p>
              <div className="grid grid-cols-2 gap-2">
                <div><span>Department:</span> <strong className="text-blue-300 block">{user.academicDetails?.department || 'N/A'}</strong></div>
                <div><span>CGPA:</span> <strong className="text-yellow-300 block">{user.academicDetails?.cgpa || 'N/A'}</strong></div>
                <div><span>Graduation Year:</span> <strong className="text-gray-200 block">{user.academicDetails?.graduationYear || 2026}</strong></div>
                <div><span>Active Backlogs:</span> <strong className="text-gray-200 block">{user.academicDetails?.activeBacklogs || 0}</strong></div>
              </div>
            </div>

            <form onSubmit={submitApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Attach or Replace PDF Resume (Uploads to Cloudinary)
                </label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="w-full bg-gray-800 p-2.5 rounded-xl text-gray-300 text-xs border border-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                {user.academicDetails?.resumeUrl && !resumeFile && (
                  <p className="text-[11px] text-green-400 mt-1 font-semibold">
                    ✓ Using resume currently on your academic profile.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedJobForApply(null); setResumeFile(null); }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplying}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {isApplying ? 'Submitting Application...' : 'Confirm & Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {showInterviewModal && selectedAppForInterview && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-indigo-500/50 rounded-2xl w-full max-w-md shadow-2xl p-6 md:p-8 space-y-5 my-auto">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Schedule Candidate Interview</h3>
                <p className="text-xs text-indigo-400 font-semibold">Candidate: {selectedAppForInterview.student?.name}</p>
              </div>
              <button 
                onClick={() => { setShowInterviewModal(false); setSelectedAppForInterview(null); }}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInterviewSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Interview Stage</label>
                <select
                  value={interviewDetails.stage}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, stage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                >
                  <option value="Assessment Round">Assessment Round</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="HR Interview">HR Interview</option>
                  <option value="Interview Scheduled">General Interview</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={interviewDetails.date}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  />
                  {interviewErrors.date && <p className="text-xs text-red-400 mt-1">{interviewErrors.date}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 AM"
                    value={interviewDetails.time}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                  />
                  {interviewErrors.time && <p className="text-xs text-red-400 mt-1">{interviewErrors.time}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Meeting Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz-abc-123"
                  value={interviewDetails.link}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, link: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowInterviewModal(false); setSelectedAppForInterview(null); }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK FILL PROFILE MODAL */}
      {showQuickProfileModal && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-yellow-500/50 rounded-2xl w-full max-w-lg shadow-2xl p-6 md:p-8 space-y-5 my-auto">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>⚡ Quick Complete Academic Profile</span>
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">Required fields to evaluate your eligibility criteria</p>
              </div>
              <button 
                onClick={() => setShowQuickProfileModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Department</label>
                <select
                  required
                  value={quickProfileData.department}
                  onChange={(e) => setQuickProfileData({ ...quickProfileData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                >
                  <option value="">-- Select Department --</option>
                  {DEPARTMENT_OPTIONS.map(d => (
                    <option key={d.code} value={d.value}>{d.icon} {d.label}</option>
                  ))}
                </select>
                {quickProfileErrors.department && <p className="text-xs text-red-400 mt-1">{quickProfileErrors.department}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">CGPA (0 - 10)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={quickProfileData.cgpa}
                    onChange={(e) => setQuickProfileData({ ...quickProfileData, cgpa: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                  {quickProfileErrors.cgpa && <p className="text-xs text-red-400 mt-1">{quickProfileErrors.cgpa}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    required
                    value={quickProfileData.graduationYear}
                    onChange={(e) => setQuickProfileData({ ...quickProfileData, graduationYear: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Upload Resume (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuickResumeFile(e.target.files[0])}
                  className="w-full bg-gray-800 p-2 rounded-xl text-gray-300 text-xs border border-gray-700 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-yellow-500 file:text-gray-950 hover:file:bg-yellow-400 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickProfileModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-xl text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
                >
                  {isQuickSaving ? 'Saving...' : 'Save & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PLACEMENT DRIVE MODAL */}
      {showEditDriveModal && editingDrive && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-blue-500/50 max-w-xl w-full rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 my-auto">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Placement Drive</h3>
                <p className="text-gray-400 text-xs mt-0.5">Update placement drive timeline and details</p>
              </div>
              <button 
                onClick={() => { setShowEditDriveModal(false); setEditingDrive(null); }}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditDrive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Drive Name</label>
                <input 
                  type="text" 
                  required 
                  value={editingDrive.name} 
                  onChange={(e) => setEditingDrive({...editingDrive, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Academic Year</label>
                  <input 
                    type="text" 
                    value={editingDrive.academicYear} 
                    onChange={(e) => setEditingDrive({...editingDrive, academicYear: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Drive Status</label>
                  <select 
                    value={editingDrive.status} 
                    onChange={(e) => setEditingDrive({...editingDrive, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea 
                  rows="3" 
                  value={editingDrive.description} 
                  onChange={(e) => setEditingDrive({...editingDrive, description: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowEditDriveModal(false); setEditingDrive(null); }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingDrive}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
                >
                  {isSavingDrive ? 'Saving...' : 'Save Drive Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT JOB MODAL */}
      {showEditJobModal && editingJob && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-blue-500/50 max-w-2xl w-full rounded-2xl shadow-2xl p-6 md:p-8 space-y-5 my-auto max-h-[90vh]">
            <div className="flex justify-between items-start border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Position Specification</h3>
                <p className="text-gray-400 text-xs mt-0.5">Modify role details, location, salary, and eligibility constraints</p>
              </div>
              <button 
                onClick={() => { setShowEditJobModal(false); setEditingJob(null); }}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Position Title</label>
                  <input 
                    type="text" 
                    required 
                    value={editingJob.title} 
                    onChange={(e) => setEditingJob({...editingJob, title: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Location</label>
                  <input 
                    type="text" 
                    required 
                    value={editingJob.location} 
                    onChange={(e) => setEditingJob({...editingJob, location: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Salary Package</label>
                  <input 
                    type="text" 
                    value={editingJob.salary} 
                    onChange={(e) => setEditingJob({...editingJob, salary: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-yellow-400 mb-1">Min CGPA</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="10"
                    value={editingJob.minCgpa} 
                    onChange={(e) => setEditingJob({...editingJob, minCgpa: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-yellow-400 mb-1">Max Backlogs</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editingJob.maxBacklogs} 
                    onChange={(e) => setEditingJob({...editingJob, maxBacklogs: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Department Checkbox Pills in Edit Job Modal */}
              <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-yellow-400">Allowed College Departments</label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditingJob(prev => ({ ...prev, allowedDepartments: COLLEGE_DEPARTMENTS.map(d => d.name) }))}
                      className="text-blue-400 hover:text-blue-300 font-bold"
                    >
                      All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => setEditingJob(prev => ({ ...prev, allowedDepartments: [] }))}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COLLEGE_DEPARTMENTS.map(dept => {
                    const isSelected = Array.isArray(editingJob.allowedDepartments) && editingJob.allowedDepartments.includes(dept.name);
                    return (
                      <button
                        key={dept.code}
                        type="button"
                        onClick={() => handleToggleDepartmentInEditJob(dept.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-400' 
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        {dept.icon} {dept.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Description</label>
                <textarea 
                  rows="2" 
                  value={editingJob.description} 
                  onChange={(e) => setEditingJob({...editingJob, description: e.target.value})}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Requirements / Skills</label>
                <input 
                  type="text" 
                  value={editingJob.requirements} 
                  onChange={(e) => setEditingJob({...editingJob, requirements: e.target.value})}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowEditJobModal(false); setEditingJob(null); }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingJob}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
                >
                  {isSavingJob ? 'Saving...' : 'Save Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-ROUND EVALUATION MODAL */}
      {showRoundModal && selectedAppForRound && (
        <RoundEvaluationModal
          application={selectedAppForRound}
          onClose={() => {
            setShowRoundModal(false);
            setSelectedAppForRound(null);
          }}
          onSuccess={(updatedApp) => {
            setApplications(applications.map(a => a._id === updatedApp._id ? updatedApp : a));
            setSelectedAppForRound(updatedApp);
          }}
        />
      )}

      {/* BULK IMPORT STUDENTS MODAL (ADMIN) */}
      {showBulkImportModal && (
        <BulkImportModal
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* RESUME PREVIEW MODAL */}
      {showResumeModal && (
        <ResumePreviewModal
          resumeData={previewResume}
          onClose={() => {
            setShowResumeModal(false);
            setPreviewResume({ url: '', studentName: '', positionTitle: '' });
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;