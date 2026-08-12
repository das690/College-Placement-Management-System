import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';

const RECRUITMENT_STAGES = [
  'Applied',
  'Shortlisted',
  'Assessment Round',
  'Technical Interview',
  'HR Interview',
  'Selected',
  'Rejected'
];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Data Science & AI'
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Drive Form State (Admin)
  const [newDrive, setNewDrive] = useState({ 
    name: '', 
    description: '', 
    academicYear: '2025-2026',
    status: 'Active' 
  });

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

  // Student Profile Resume Upload State
  const [profileResumeFile, setProfileResumeFile] = useState(null);
  const [isUploadingProfileResume, setIsUploadingProfileResume] = useState(false);

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
    allowedDepartments: '',
    targetGraduationYear: 2026
  });

  // Application & Interview Modals
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({ date: '', time: '', link: '', stage: 'Technical Interview' });

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
  const [isQuickSaving, setIsQuickSaving] = useState(false);

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

    // 3. Department Check
    if (allowedDepartments && allowedDepartments.length > 0 && details.department) {
      const match = allowedDepartments.some(dept => 
        dept.toLowerCase().trim() === (details.department || '').toLowerCase().trim()
      );
      if (!match) {
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
      
      // Post FormData without manual header to let Axios set correct boundary
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

      toast.success("Resume PDF uploaded & saved to academic profile!");
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
    try {
      const res = await API.post('/drives', newDrive);
      toast.success('Placement Drive Created Successfully!');
      setDrives([res.data, ...drives]);
      setNewDrive({ name: '', description: '', academicYear: '2025-2026', status: 'Active' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create drive');
    }
  };

  const handleUpdateDriveStatus = async (driveId, newStatus) => {
    try {
      const res = await API.put(`/drives/${driveId}`, { status: newStatus });
      setDrives(drives.map(d => d._id === driveId ? res.data : d));
      toast.success(`Drive status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update drive status');
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm("Are you sure you want to delete this placement drive?")) return;
    try {
      await API.delete(`/drives/${driveId}`);
      setDrives(drives.filter(d => d._id !== driveId));
      toast.success("Placement drive removed");
    } catch (error) {
      toast.error("Failed to delete drive");
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJob.drive) return toast.error("You must select a Placement Drive");

    const formattedJob = {
      ...newJob,
      eligibility: {
        minCgpa: Number(newJob.minCgpa),
        maxBacklogs: Number(newJob.maxBacklogs),
        targetGraduationYear: Number(newJob.targetGraduationYear),
        allowedDepartments: typeof newJob.allowedDepartments === 'string' 
          ? newJob.allowedDepartments.split(',').map(d => d.trim()).filter(Boolean)
          : newJob.allowedDepartments
      }
    };

    try {
      const res = await API.post('/jobs', formattedJob);
      toast.success('Position successfully posted within Placement Drive!');
      setJobs([res.data, ...jobs]);
      navigate('/dashboard/jobs');
      setNewJob({
        title: '', description: '', requirements: '', location: '', salary: '', 
        drive: '', minCgpa: 0, maxBacklogs: 0, allowedDepartments: '', targetGraduationYear: 2026
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post position');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this position?")) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter(job => job._id !== jobId));
      toast.success("Job position removed");
    } catch (error) {
      toast.error("Failed to delete job");
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (newStatus === 'Technical Interview' || newStatus === 'HR Interview') {
      setSelectedAppForInterview(appId);
      setInterviewDetails(prev => ({ ...prev, stage: newStatus }));
      setShowInterviewModal(true);
      return; 
    }
    try {
      await API.put(`/applications/${appId}/status`, { status: newStatus });
      setApplications(applications.map(app => app._id === appId ? { ...app, status: newStatus } : app));
      toast.success(`Application updated to stage: ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/applications/${selectedAppForInterview}/status`, { 
        status: interviewDetails.stage,
        interviewDate: interviewDetails.date,
        interviewTime: interviewDetails.time,
        interviewLink: interviewDetails.link
      });
      setApplications(applications.map(app => app._id === selectedAppForInterview ? { 
        ...app, 
        status: interviewDetails.stage,
        interviewDate: interviewDetails.date,
        interviewTime: interviewDetails.time,
        interviewLink: interviewDetails.link 
      } : app));
      toast.success(`Interview scheduled for candidate! Stage: ${interviewDetails.stage}`);
      setShowInterviewModal(false);
      setSelectedAppForInterview(null);
    } catch (error) {
      toast.error('Failed to schedule interview');
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm("Terminate this application record?")) return;
    try {
      await API.delete(`/applications/${appId}`);
      setApplications(applications.filter(app => app._id !== appId));
      toast.success("Application terminated");
    } catch (error) {
      toast.error("Failed to terminate application");
    }
  };

  // ================= STUDENT HANDLERS =================
  const handleSaveProfile = async (e) => {
    e.preventDefault();
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
    if (!window.confirm("Withdraw your application from this drive position?")) return;
    try {
      await API.delete(`/applications/${appId}`);
      setApplications(applications.filter(app => app._id !== appId));
      toast.success("Application withdrawn successfully");
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
  const placementPercentage = filteredAppsByDrive.length > 0 
    ? Math.round((selectedCount / filteredAppsByDrive.length) * 100) 
    : 0;

  // Department-wise Stats
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

  // Organization-wise Hiring Stats
  const orgStats = useMemo(() => {
    const orgMap = {};

    filteredJobsByDrive.forEach(job => {
      const compName = job.company?.name || 'Organization';
      const compId = job.company?._id || compName;
      if (!orgMap[compId]) {
        orgMap[compId] = { name: compName, positions: 0, applications: 0, selected: 0 };
      }
      orgMap[compId].positions += 1;
    });

    filteredAppsByDrive.forEach(app => {
      const compName = app.job?.company?.name || 'Organization';
      const compId = app.job?.company?._id || compName;
      if (!orgMap[compId]) {
        orgMap[compId] = { name: compName, positions: 0, applications: 0, selected: 0 };
      }
      orgMap[compId].applications += 1;
      if (app.status === 'Selected' || app.status === 'Hired') {
        orgMap[compId].selected += 1;
      }
    });

    return Object.values(orgMap);
  }, [filteredJobsByDrive, filteredAppsByDrive]);

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
            <p className="text-xs text-gray-400">Workflow: Placement Drive &rarr; Organization &rarr; Position &rarr; Application</p>
          </div>
        </div>

        {/* Global Placement Drive Filter */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase text-gray-400 whitespace-nowrap">Filter Drive:</label>
          <select 
            value={selectedDriveFilter} 
            onChange={(e) => setSelectedDriveFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-blue-500/40 rounded-xl text-white text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">🌐 All Placement Drives ({drives.length})</option>
            {drives.map(d => (
              <option key={d._id} value={d._id}>🎯 {d.name} ({d.academicYear || 'Active'})</option>
            ))}
          </select>
        </div>
      </div>

      {/* NAVIGATION BUTTONS */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button 
          onClick={() => navigate('/dashboard')} 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          📊 Overview
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
              📈 Placement Analytics
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
      {/*                       STUDENT VIEWS                       */}
      {/* ========================================================= */}
      {user.role === 'student' && (
        <div className="space-y-8">
          
          {/* PROFILE INCOMPLETE WARNING BANNER */}
          {user.role === 'student' && getMissingAcademicFields(user).length > 0 && (
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
                  <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Active Drives</p><h3 className="text-3xl font-bold text-white">{drives.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">My Applications</p><h3 className="text-3xl font-bold text-white">{applications.length}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-green-900/30 text-green-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                  <div><p className="text-gray-400 text-xs uppercase font-semibold">Offers Received</p><h3 className="text-3xl font-bold text-white">{selectedCount}</h3></div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-cyan-900/30 text-cyan-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>
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
                  <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">Track Applications &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">View status of your applications through shortlisting, interviews, and offers.</p>
                </button>
                <button onClick={() => navigate('/dashboard/profile')} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-green-500 text-left transition-all group shadow-lg">
                  <h3 className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">Update Profile &rarr;</h3>
                  <p className="text-gray-400 text-sm mt-2">Keep your CGPA, department, skills, and resume updated for placement drives.</p>
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
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Department / Program</span>
                      {!studentProfile.department && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                    </label>
                    <select 
                      required 
                      value={studentProfile.department} 
                      onChange={(e) => setStudentProfile({...studentProfile, department: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Department --</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
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
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>Cumulative CGPA</span>
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
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Active Backlogs</label>
                    <input 
                      type="number" 
                      min="0"
                      required 
                      value={studentProfile.activeBacklogs} 
                      onChange={(e) => setStudentProfile({...studentProfile, activeBacklogs: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
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
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Certifications (Comma Separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. AWS Certified Cloud Practitioner, NPTEL Algorithms"
                      value={studentProfile.certifications} 
                      onChange={(e) => setStudentProfile({...studentProfile, certifications: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                    />
                  </div>

                  {/* RESUME PDF UPLOAD CONTAINER */}
                  <div className="bg-gray-900/80 p-5 rounded-2xl border border-gray-700/80 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-blue-400 flex items-center gap-2">
                        <span>Upload Academic Resume (PDF File)</span>
                        {!studentProfile.resumeUrl && <span className="text-xs text-red-400 font-bold">✕ Missing</span>}
                      </label>
                      {studentProfile.resumeUrl && (
                        <a href={studentProfile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1">
                          📄 View Current Resume
                        </a>
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
                      <p className="text-xs text-blue-400 font-semibold animate-pulse">Uploading PDF Resume to Portal...</p>
                    )}
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Resume Document URL (Auto-filled on upload)</label>
                      <input 
                        type="url" 
                        placeholder="https://.../resume.pdf"
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
                  placeholder="Search by title or company..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full md:w-80 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500" 
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
                      <div key={job._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-between hover:border-gray-500 transition-all shadow-lg">
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
                          <p className="text-blue-400 text-sm font-semibold mb-3">{job.company?.name || 'Participating Company'}</p>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{job.description}</p>

                          {/* Eligibility Criteria Breakdown */}
                          <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-700/60 mb-4 space-y-1 text-xs">
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
                                <span>Allowed Depts:</span>
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

          {/* APPLICATION TRACKER & RECRUITMENT STAGES */}
          {currentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <h3 className="text-xl font-bold text-white">Application Pipeline & Recruitment Progress</h3>
              
              {filteredAppsByDrive.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-700">
                  <p className="text-gray-400">No applications submitted for the selected Placement Drive yet.</p>
                  <button onClick={() => navigate('/dashboard/opportunities')} className="mt-4 text-blue-400 hover:text-blue-300 font-semibold">Browse Open Placement Positions &rarr;</button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4">Placement Drive</th>
                        <th className="px-6 py-4">Position Title</th>
                        <th className="px-6 py-4">Company</th>
                        <th className="px-6 py-4">Recruitment Stage</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {filteredAppsByDrive.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-6 py-4 text-blue-400 font-semibold">
                            {app.drive?.name || app.job?.drive?.name || 'Campus Drive'}
                          </td>
                          <td className="px-6 py-4 text-white font-semibold">{app.job?.title || 'Position'}</td>
                          <td className="px-6 py-4 text-gray-300">{app.job?.company?.name || 'Organization'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(app.status)}`}>
                              {app.status}
                            </span>
                            
                            {/* Show Scheduled Interview Details */}
                            {(app.status === 'Technical Interview' || app.status === 'HR Interview' || app.status === 'Interview Scheduled') && app.interviewDate && (
                              <div className="mt-2 p-2 bg-indigo-900/40 border border-indigo-700/60 rounded-xl text-xs text-indigo-200 w-max">
                                <p className="font-semibold mb-0.5">📅 {app.interviewDate} at {app.interviewTime}</p>
                                <a href={app.interviewLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-bold hover:text-indigo-300">Join Video Interview</a>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status !== 'Selected' && app.status !== 'Hired' && (
                              <button onClick={() => handleWithdrawApplication(app._id)} className="text-red-400 hover:text-red-300 font-medium bg-red-950/40 border border-red-800/50 px-3 py-1 rounded-lg">
                                Withdraw
                              </button>
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
        </div>
      )}

      {/* ========================================================= */}
      {/*                        ADMIN VIEWS                        */}
      {/* ========================================================= */}
      {user.role === 'admin' && (
        <div className="space-y-8">
          
          {/* OVERVIEW */}
          {currentView === 'overview' && (
            <div className="animate-fade-in space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <button onClick={() => navigate('/dashboard/drives')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-blue-500 transition-all flex items-center gap-4 group">
                  <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Placement Drives</p><h3 className="text-3xl font-bold text-white">{drives.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/jobs')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-purple-500 transition-all flex items-center gap-4 group">
                  <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Drive Positions</p><h3 className="text-3xl font-bold text-white">{jobs.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/applications')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-yellow-500 transition-all flex items-center gap-4 group">
                  <div className="p-4 rounded-xl bg-yellow-900/30 text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Total Applications</p><h3 className="text-3xl font-bold text-white">{applications.length}</h3></div>
                </button>
                <button onClick={() => navigate('/dashboard/analytics')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-green-500 transition-all flex items-center gap-4 group">
                  <div className="p-4 rounded-xl bg-green-900/30 text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase">Placement Outcome</p><h3 className="text-3xl font-bold text-white">{placementPercentage}%</h3></div>
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
                <form onSubmit={handleCreateDrive} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    type="text" 
                    required 
                    placeholder="Drive Name (e.g. Campus Placement Drive 2026)" 
                    value={newDrive.name} 
                    onChange={(e) => setNewDrive({...newDrive, name: e.target.value})} 
                    className="px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="text" 
                    placeholder="Academic Year (e.g. 2025-2026)" 
                    value={newDrive.academicYear} 
                    onChange={(e) => setNewDrive({...newDrive, academicYear: e.target.value})} 
                    className="px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="text" 
                    placeholder="Description (Optional)" 
                    value={newDrive.description} 
                    onChange={(e) => setNewDrive({...newDrive, description: e.target.value})} 
                    className="px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500" 
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-md">
                    Create Placement Drive
                  </button>
                </form>
              </div>

              {/* Drives List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {drives.map(drive => (
                  <div key={drive._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex flex-col justify-between">
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

                    <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                      <select 
                        value={drive.status} 
                        onChange={(e) => handleUpdateDriveStatus(drive._id, e.target.value)}
                        className="bg-gray-900 text-xs font-semibold text-gray-300 border border-gray-700 rounded-lg px-2.5 py-1 outline-none"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <button onClick={() => handleDeleteDrive(drive._id)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1">
                        Delete Drive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANAGE POSITIONS */}
          {currentView === 'jobs' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6">Manage Posted Positions (Drive Linked)</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Placement Drive</th>
                      <th className="px-6 py-4">Position Title</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Eligibility (CGPA / Backlogs)</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {filteredJobsByDrive.map((job) => (
                      <tr key={job._id} className="hover:bg-gray-700/40 transition-colors">
                        <td className="px-6 py-4 text-blue-400 font-semibold">{job.drive?.name || 'Campus Drive'}</td>
                        <td className="px-6 py-4 font-bold text-white">{job.title}</td>
                        <td className="px-6 py-4">{job.company?.name || 'Internal'}</td>
                        <td className="px-6 py-4 text-xs text-gray-300">
                          Min CGPA: {job.eligibility?.minCgpa || 0} | Max Backlogs: {job.eligibility?.maxBacklogs ?? 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteJob(job._id)} className="text-red-400 hover:text-red-300 font-medium px-3 py-1 bg-red-950/40 rounded-lg border border-red-800/50">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MANAGE ALL APPLICATIONS */}
          {currentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <h3 className="text-xl font-bold text-white">Student Application Pipeline & Stage Management</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Student Name & Dept</th>
                      <th className="px-6 py-4">Drive & Position</th>
                      <th className="px-6 py-4">Resume</th>
                      <th className="px-6 py-4">Recruitment Stage</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {filteredAppsByDrive.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{app.student?.name || 'Student'}</p>
                          <p className="text-xs text-gray-400">{app.student?.academicDetails?.department} | CGPA: {app.student?.academicDetails?.cgpa}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-blue-400">{app.drive?.name || app.job?.drive?.name}</p>
                          <p className="text-xs text-gray-300">{app.job?.title} ({app.job?.company?.name})</p>
                        </td>
                        <td className="px-6 py-4">
                          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 text-xs">View Resume</a>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={app.status} 
                            onChange={(e) => handleStatusChange(app._id, e.target.value)} 
                            className={`text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer border ${getStatusStyle(app.status)}`}
                          >
                            {RECRUITMENT_STAGES.map(stage => (
                              <option key={stage} value={stage} className="bg-gray-900 text-white">{stage}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteApplication(app._id)} className="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1 bg-red-950/40 rounded-lg border border-red-800/50">
                            Terminate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLACEMENT ANALYTICS & DRIVE REPORTING */}
          {currentView === 'analytics' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-xs uppercase font-bold">Target Drive</p>
                  <h3 className="text-lg font-bold text-blue-400 mt-1 truncate">
                    {selectedDriveFilter === 'ALL' ? 'All Placement Drives' : (drives.find(d => d._id === selectedDriveFilter)?.name || 'Drive')}
                  </h3>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-xs uppercase font-bold">Total Applications</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{filteredAppsByDrive.length}</h3>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-xs uppercase font-bold">Placed Students</p>
                  <h3 className="text-3xl font-bold text-green-400 mt-1">{selectedCount}</h3>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-xs uppercase font-bold">Placement Rate</p>
                  <h3 className="text-3xl font-bold text-cyan-400 mt-1">{placementPercentage}%</h3>
                </div>
              </div>

              {/* Department Statistics Table */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4">Department-wise Placement Report</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Applications Submitted</th>
                        <th className="px-6 py-4">Selections / Hires</th>
                        <th className="px-6 py-4">Department Placement %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {deptStats.map(d => {
                        const pct = d.applications > 0 ? Math.round((d.selected / d.applications) * 100) : 0;
                        return (
                          <tr key={d.department} className="hover:bg-gray-700/40">
                            <td className="px-6 py-4 font-bold text-white">{d.department}</td>
                            <td className="px-6 py-4 text-blue-400 font-semibold">{d.applications}</td>
                            <td className="px-6 py-4 text-green-400 font-semibold">{d.selected}</td>
                            <td className="px-6 py-4 font-bold text-cyan-400">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Organization-wise Hiring Statistics Table */}
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-4">Organization-wise Hiring Statistics</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4">Participating Organization</th>
                        <th className="px-6 py-4">Drive Positions</th>
                        <th className="px-6 py-4">Candidate Applications</th>
                        <th className="px-6 py-4">Selected / Hired</th>
                        <th className="px-6 py-4">Hiring Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {orgStats.map(org => {
                        const hireRate = org.applications > 0 ? Math.round((org.selected / org.applications) * 100) : 0;
                        return (
                          <tr key={org.name} className="hover:bg-gray-700/40">
                            <td className="px-6 py-4 font-bold text-white">{org.name}</td>
                            <td className="px-6 py-4 text-purple-400 font-semibold">{org.positions}</td>
                            <td className="px-6 py-4 text-blue-400 font-semibold">{org.applications}</td>
                            <td className="px-6 py-4 text-green-400 font-semibold">{org.selected}</td>
                            <td className="px-6 py-4 font-bold text-cyan-400">{hireRate}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/*                       COMPANY VIEWS                       */}
      {/* ========================================================= */}
      {user.role === 'company' && (
        <div className="space-y-8">
          
          {/* OVERVIEW */}
          {currentView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <button onClick={() => navigate('/dashboard/post')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-blue-500 flex items-center gap-4 transition-all group shadow-lg">
                <div className="p-4 rounded-xl bg-blue-900/30 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>
                <div><p className="text-gray-400 text-xs font-semibold uppercase">Participate in Drive</p><h3 className="text-xl font-bold text-white mt-1">Post Position &rarr;</h3></div>
              </button>
              <button onClick={() => navigate('/dashboard/jobs')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-green-500 flex items-center gap-4 transition-all group shadow-lg">
                <div className="p-4 rounded-xl bg-green-900/30 text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                <div><p className="text-gray-400 text-xs font-semibold uppercase">Our Positions</p><h3 className="text-xl font-bold text-white mt-1">{jobs.length} Positions &rarr;</h3></div>
              </button>
              <button onClick={() => navigate('/dashboard/applications')} className="text-left p-6 rounded-2xl border bg-gray-800 border-gray-700 hover:border-purple-500 flex items-center gap-4 transition-all group shadow-lg">
                <div className="p-4 rounded-xl bg-purple-900/30 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                <div><p className="text-gray-400 text-xs font-semibold uppercase">Candidate Pipeline</p><h3 className="text-xl font-bold text-white mt-1">{applications.length} Candidates &rarr;</h3></div>
              </button>
            </div>
          )}

          {/* CREATE POSITION (DRIVE LINKED) */}
          {currentView === 'post' && (
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl max-w-3xl mx-auto animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-2">Create Position (Drive Linked)</h2>
              <p className="text-gray-400 text-sm mb-6">Positions must be associated with an active Placement Drive before creation.</p>
              
              <form onSubmit={handleCreateJob} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-blue-400 mb-1.5">Target Placement Drive</label>
                  <select 
                    required 
                    value={newJob.drive} 
                    onChange={(e) => setNewJob({...newJob, drive: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-900/60 rounded-xl text-white outline-none border border-blue-500/50 focus:border-blue-500"
                  >
                    <option value="">-- Select Active Placement Drive --</option>
                    {drives.map(d => <option key={d._id} value={d._id}>{d.name} ({d.academicYear || '2025-2026'})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-700">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Position Title</label>
                    <input type="text" required placeholder="e.g. Software Developer" value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Location</label>
                    <input type="text" required placeholder="e.g. Bengaluru / Remote" value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-1.5">Salary Package (CTC)</label>
                    <input type="text" placeholder="e.g. ₹8,00,000 LPA" value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-yellow-400 mb-1.5">Target Graduation Year</label>
                    <input type="number" required value={newJob.targetGraduationYear} onChange={(e) => setNewJob({...newJob, targetGraduationYear: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-yellow-400 mb-1.5">Minimum CGPA Required</label>
                    <input type="number" step="0.1" required value={newJob.minCgpa} onChange={(e) => setNewJob({...newJob, minCgpa: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-yellow-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-yellow-400 mb-1.5">Max Active Backlogs Allowed</label>
                    <input type="number" required value={newJob.maxBacklogs} onChange={(e) => setNewJob({...newJob, maxBacklogs: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-yellow-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-yellow-400 mb-1.5">Allowed Departments (Comma Separated)</label>
                    <input type="text" placeholder="Computer Science, Information Technology, Electronics & Communication" value={newJob.allowedDepartments} onChange={(e) => setNewJob({...newJob, allowedDepartments: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-yellow-500" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Job Description & Responsibilities</label>
                  <textarea required rows="4" value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-blue-500 mb-4"></textarea>
                  <input type="text" required placeholder="Required Tech Stack (e.g. MERN Stack, Python, AWS)" value={newJob.requirements} onChange={(e) => setNewJob({...newJob, requirements: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/60 rounded-xl text-white outline-none border border-gray-600 focus:border-blue-500" />
                </div>

                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg">
                  Publish Position & Open for Applications
                </button>
              </form>
            </div>
          )}

          {/* MANAGE POSITIONS */}
          {currentView === 'jobs' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6">Our Drive Postings</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Position Title</th>
                      <th className="px-6 py-4">Placement Drive</th>
                      <th className="px-6 py-4">Min CGPA</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {filteredJobsByDrive.map((job) => (
                      <tr key={job._id} className="hover:bg-gray-700/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{job.title}</td>
                        <td className="px-6 py-4 text-blue-400 font-semibold">{job.drive?.name || 'Campus Drive'}</td>
                        <td className="px-6 py-4">{job.eligibility?.minCgpa || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteJob(job._id)} className="text-red-400 hover:text-red-300 px-3 py-1 bg-red-950/40 rounded-lg border border-red-800/50">
                            Withdraw
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CANDIDATE PIPELINE */}
          {currentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <h3 className="text-xl font-bold text-white">Candidate Pipeline & Stage Advancement</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Applicant Name</th>
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Academic Details</th>
                      <th className="px-6 py-4">Resume</th>
                      <th className="px-6 py-4 text-right">Recruitment Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {filteredAppsByDrive.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{app.student?.name || 'Candidate'}</td>
                        <td className="px-6 py-4 text-blue-400 font-semibold">{app.job?.title}</td>
                        <td className="px-6 py-4 text-xs text-gray-300">
                          {app.student?.academicDetails?.department} | CGPA: {app.student?.academicDetails?.cgpa}
                        </td>
                        <td className="px-6 py-4">
                          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold text-xs">View Resume</a>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select 
                            value={app.status} 
                            onChange={(e) => handleStatusChange(app._id, e.target.value)} 
                            className={`text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer border ${getStatusStyle(app.status)}`}
                          >
                            {RECRUITMENT_STAGES.map(stage => (
                              <option key={stage} value={stage} className="bg-gray-900 text-white">{stage}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT UPLOAD RESUME MODAL */}
      {selectedJobForApply && (
        <div className="fixed inset-0 pt-16 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md w-full m-4 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Apply for Position</h3>
              <p className="text-blue-400 text-sm font-semibold">{selectedJobForApply.title} ({selectedJobForApply.company?.name})</p>
              <p className="text-xs text-gray-400 mt-1">Drive: {selectedJobForApply.drive?.name}</p>
            </div>

            <form onSubmit={submitApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Attach Resume PDF</label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setResumeFile(e.target.files[0])} 
                  className="w-full bg-gray-900/50 p-2.5 rounded-xl text-gray-300 text-xs border border-gray-700" 
                />
                {user.academicDetails?.resumeUrl && (
                  <p className="text-xs text-gray-400 mt-1">Or use default profile resume if no file selected.</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setSelectedJobForApply(null)} className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-semibold hover:bg-gray-600">Cancel</button>
                <button type="submit" disabled={isApplying} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 disabled:bg-blue-900">
                  {isApplying ? 'Submitting...' : 'Confirm Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE INTERVIEW MODAL */}
      {showInterviewModal && (
        <div className="fixed inset-0 pt-16 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md w-full m-4 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white">Schedule Candidate Interview</h3>
              <p className="text-gray-400 text-sm">Stage: <span className="font-bold text-indigo-400">{interviewDetails.stage}</span></p>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Interview Date</label>
                <input type="date" required value={interviewDetails.date} onChange={(e) => setInterviewDetails({...interviewDetails, date: e.target.value})} className="w-full px-4 py-2 bg-gray-900/60 border border-gray-600 rounded-xl text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Interview Time</label>
                <input type="time" required value={interviewDetails.time} onChange={(e) => setInterviewDetails({...interviewDetails, time: e.target.value})} className="w-full px-4 py-2 bg-gray-900/60 border border-gray-600 rounded-xl text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Meeting Link (Google Meet / Zoom)</label>
                <input type="url" required placeholder="https://meet.google.com/..." value={interviewDetails.link} onChange={(e) => setInterviewDetails({...interviewDetails, link: e.target.value})} className="w-full px-4 py-2 bg-gray-900/60 border border-gray-600 rounded-xl text-white text-sm outline-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowInterviewModal(false); setSelectedAppForInterview(null); }} className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-xl font-semibold hover:bg-gray-600">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK-FILL MISSING ACADEMIC PROFILE MODAL */}
      {showQuickProfileModal && (
        <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
          <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-yellow-500/50 max-w-lg w-full shadow-2xl space-y-5 my-auto">
            <div className="border-b border-gray-700 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 bg-yellow-950/80 px-2.5 py-1 rounded border border-yellow-800">
                Action Required
              </span>
              <h3 className="text-xl font-bold text-white mt-2">Configure Missing Academic Profile</h3>
              <p className="text-gray-300 text-xs mt-1">
                Please fill in the missing details below to satisfy placement drive eligibility checks and proceed with your application.
              </p>
            </div>

            <form onSubmit={handleSaveQuickProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex justify-between">
                    <span>Department</span>
                    {(!quickProfileData.department) && <span className="text-red-400 font-bold text-[10px]">✕ Missing</span>}
                  </label>
                  <select 
                    required
                    value={quickProfileData.department}
                    onChange={(e) => setQuickProfileData({...quickProfileData, department: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  >
                    <option value="">-- Select Department --</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex justify-between">
                    <span>Graduation Year</span>
                    {(!quickProfileData.graduationYear) && <span className="text-red-400 font-bold text-[10px]">✕ Missing</span>}
                  </label>
                  <input 
                    type="number" 
                    required
                    value={quickProfileData.graduationYear}
                    onChange={(e) => setQuickProfileData({...quickProfileData, graduationYear: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex justify-between">
                    <span>CGPA (0 - 10)</span>
                    {(quickProfileData.cgpa === '' || quickProfileData.cgpa === undefined) && <span className="text-red-400 font-bold text-[10px]">✕ Missing</span>}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    max="10"
                    min="0"
                    required
                    placeholder="e.g. 8.5"
                    value={quickProfileData.cgpa}
                    onChange={(e) => setQuickProfileData({...quickProfileData, cgpa: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Active Backlogs</label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    value={quickProfileData.activeBacklogs}
                    onChange={(e) => setQuickProfileData({...quickProfileData, activeBacklogs: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white text-xs outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700/80 space-y-2">
                <label className="block text-xs font-bold text-yellow-400 flex justify-between items-center">
                  <span>Upload PDF Resume</span>
                  {(!quickProfileData.resumeUrl && !user.academicDetails?.resumeUrl) && (
                    <span className="text-red-400 font-bold text-[10px]">✕ Missing</span>
                  )}
                </label>
                
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setQuickResumeFile(e.target.files[0])}
                  className="w-full bg-gray-800 p-2 rounded-xl text-gray-300 text-xs border border-gray-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-yellow-500 file:text-gray-950 hover:file:bg-yellow-400 cursor-pointer"
                />

                {(quickProfileData.resumeUrl || user.academicDetails?.resumeUrl) && (
                  <p className="text-[11px] text-green-400 font-semibold flex items-center gap-1">
                    ✓ Profile Resume already attached. (Selecting a new file will replace it)
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowQuickProfileModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isQuickSaving}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-xl text-xs font-bold shadow-lg transition-colors disabled:opacity-50"
                >
                  {isQuickSaving ? 'Saving Profile...' : 'Save & Unlock Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;