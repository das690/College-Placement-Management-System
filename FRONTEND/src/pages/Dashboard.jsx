import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Forms
  const [searchTerm, setSearchTerm] = useState('');
  const [newJob, setNewJob] = useState({
    title: '', description: '', requirements: '', location: '', salary: ''
  });

  // Student Modals & State
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [studentView, setStudentView] = useState('applications'); 

  // Company Modals & State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({ date: '', time: '', link: '' });
  const [companyView, setCompanyView] = useState('applications'); // NEW: Controls company tabs

  // Admin View State
  const [adminView, setAdminView] = useState('overview');
  const [showAdminJobForm, setShowAdminJobForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          API.get('/jobs'),
          API.get('/applications')
        ]);
        
        const allJobs = jobsRes.data;
        let allApps = appsRes.data;

        // Stitch job data into applications for easy rendering
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
          // Strictly filter applications so the student ONLY sees their own
          const myApps = allApps.filter(app => {
            const studentId = typeof app.student === 'object' ? app.student?._id : app.student;
            return studentId === user._id;
          });
          setApplications(myApps);
        } else if (user.role === 'company') {
          // Filter jobs for the logged-in company
          const myJobs = allJobs.filter(job => {
             const compId = typeof job.company === 'object' ? job.company?._id : job.company;
             return compId === user._id;
          });
          setJobs(myJobs);

          // Filter applications targeting this company's jobs
          const myJobIds = myJobs.map(j => j._id);
          const myApps = allApps.filter(app => {
             const appId = typeof app.job === 'object' ? app.job?._id : app.job;
             return myJobIds.includes(appId);
          });
          setApplications(myApps);
        }
      } catch (error) {
        toast.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // ================= ADMIN & COMPANY HANDLERS =================
  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("WARNING: Are you sure you want to delete this job? This action cannot be undone.")) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      setJobs(jobs.filter(job => job._id !== jobId));
      toast.success("Job deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete job");
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm("WARNING: Are you sure you want to terminate this student's application?")) return;
    try {
      await API.delete(`/applications/${appId}`);
      setApplications(applications.filter(app => app._id !== appId));
      toast.success("Application terminated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to terminate application");
    }
  };

  // ================= STUDENT HANDLERS =================
  const handleWithdrawApplication = async (appId) => {
    if (!window.confirm("Are you sure you want to withdraw your application from this role?")) return;
    try {
      await API.delete(`/applications/${appId}`);
      setApplications(applications.filter(app => app._id !== appId));
      toast.success("Application successfully withdrawn");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to withdraw application");
    }
  };

  // ================= UNIVERSAL HANDLERS =================
  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/jobs', newJob);
      toast.success('Job posted successfully!');
      setNewJob({ title: '', description: '', requirements: '', location: '', salary: '' });
      setJobs([...jobs, res.data]);
      setShowAdminJobForm(false);
      if (user.role === 'company') setCompanyView('jobs'); // Redirect company to their jobs tab after posting
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post job');
    }
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!resumeFile) return toast.error("Please select a PDF resume");
    
    setIsApplying(true);
    const applyPromise = async () => {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const uploadRes = await API.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const resumeUrl = uploadRes.data.resumeUrl;
      const res = await API.post('/applications', { jobId: selectedJobId, resumeUrl });
      
      const fullJobDetails = jobs.find(j => j._id === selectedJobId);
      setApplications([...applications, { ...res.data, job: fullJobDetails }]);
    };

    toast.promise(applyPromise(), {
      loading: 'Uploading resume and applying...',
      success: 'Successfully applied to the job!',
      error: (err) => err.response?.data?.message || 'Failed to apply'
    }).then(() => {
      setSelectedJobId(null);
      setResumeFile(null);
    }).finally(() => setIsApplying(false));
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (newStatus === 'Interview Scheduled') {
      setSelectedAppForInterview(appId);
      setShowInterviewModal(true);
      return; 
    }
    try {
      await API.put(`/applications/${appId}/status`, { status: newStatus });
      
      // Update UI without reload
      setApplications(applications.map(app => 
        app._id === appId ? { ...app, status: newStatus } : app
      ));
      toast.success('Applicant status updated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/applications/${selectedAppForInterview}/status`, { 
        status: 'Interview Scheduled',
        interviewDate: interviewDetails.date,
        interviewTime: interviewDetails.time,
        interviewLink: interviewDetails.link
      });
      
      // Update UI without reload
      setApplications(applications.map(app => 
        app._id === selectedAppForInterview ? { 
          ...app, 
          status: 'Interview Scheduled',
          interviewDate: interviewDetails.date,
          interviewTime: interviewDetails.time,
          interviewLink: interviewDetails.link
        } : app
      ));

      toast.success('Interview scheduled and sent to student!');
      setShowInterviewModal(false);
      setInterviewDetails({ date: '', time: '', link: '' }); 
      setSelectedAppForInterview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule interview');
    }
  };

  const hasApplied = (jobId) => applications.some(app => {
      const appId = typeof app.job === 'object' ? app.job?._id : app.job;
      return appId === jobId;
  });

  if (loading) return <div className="text-center mt-20 text-gray-400">Loading your dashboard...</div>;

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Applied': return 'bg-blue-900/50 text-blue-300 border-blue-800';
      case 'Reviewed': return 'bg-yellow-900/50 text-yellow-300 border-yellow-800';
      case 'Shortlisted': return 'bg-purple-900/50 text-purple-300 border-purple-800';
      case 'Interview Scheduled': return 'bg-indigo-900/50 text-indigo-300 border-indigo-800';
      case 'Hired': return 'bg-green-900/50 text-green-300 border-green-800';
      case 'Rejected': return 'bg-red-900/50 text-red-300 border-red-800';
      default: return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  // ================= DATA COMPILATION =================
  const totalJobs = jobs.length;
  const totalApplications = applications.length;
  const hiredApplications = applications.filter(app => app.status === 'Hired');
  const hiredCount = hiredApplications.length;

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
  const COLORS = ['#3b82f6', '#eab308', '#a855f7', '#6366f1', '#22c55e', '#ef4444'];

  const companyCounts = jobs.reduce((acc, job) => {
    const companyName = typeof job.company === 'object' ? job.company?.name : 'Unknown Company';
    acc[companyName] = (acc[companyName] || 0) + 1;
    return acc;
  }, {});
  const barData = Object.keys(companyCounts).map(key => ({ name: key, jobs: companyCounts[key] }));

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (job.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Back Button Logic - Hidden for Students AND Companies */}
      {user.role === 'admin' && adminView !== 'overview' && (
        <button onClick={() => setAdminView('overview')} className="text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors group mb-2">
          <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          <span className="text-sm font-medium">Back to Main Analytics</span>
        </button>
      )}

      <header className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">
          {user.role === 'admin' && adminView !== 'overview' ? `Admin Panel / ${adminView.toUpperCase()}` : 'Dashboard'}
        </h1>
        <p className="text-gray-400 mt-1">
          Welcome back, {user.name}. You are logged in as a <span className="font-semibold text-blue-400 uppercase">{user.role}</span>.
        </p>
      </header>

      {/* ========================================================= */}
      {/*                       STUDENT VIEW                        */}
      {/* ========================================================= */}
      {user.role === 'student' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border bg-gray-800 border-gray-700 shadow-lg flex items-center gap-4">
              <div className="p-4 rounded-xl bg-gray-900/50 text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Companies Applied</p>
                <h3 className="text-3xl font-bold text-white">{applications.length} <span className="text-lg text-gray-500 font-normal">/ {jobs.length}</span></h3>
              </div>
            </div>

            <button onClick={() => setStudentView('applications')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${studentView === 'applications' ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/50' : 'bg-gray-800 border-gray-700 hover:border-purple-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${studentView === 'applications' ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">My Applications</p>
                <h3 className="text-xl font-bold text-white mt-1">View Status &rarr;</h3>
              </div>
            </button>

            <button onClick={() => setStudentView('opportunities')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${studentView === 'opportunities' ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50' : 'bg-gray-800 border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${studentView === 'opportunities' ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Job Board</p>
                <h3 className="text-xl font-bold text-white mt-1">Explore Roles &rarr;</h3>
              </div>
            </button>
          </div>

          {studentView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-bold text-white">Application Tracker</h3><p className="text-sm text-gray-400">Monitor corporate responses and manage active submissions.</p></div>
              </div>
              
              {applications.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-700">
                  <p className="text-gray-400">You haven't submitted any applications yet.</p>
                  <button onClick={() => setStudentView('opportunities')} className="mt-4 text-blue-400 hover:text-blue-300 font-medium">Browse Available Jobs &rarr;</button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/70 text-gray-200 font-medium border-b border-gray-700">
                      <tr><th className="px-6 py-4">Job Title</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">Current Status</th><th className="px-6 py-4">Resume Sent</th><th className="px-6 py-4 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {applications.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{app.job?.title || 'Unknown Role'}</td>
                          <td className="px-6 py-4 text-blue-400">{app.job?.company?.name || 'Unknown Company'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-block mb-1 ${getStatusStyle(app.status)}`}>{app.status}</span>
                            {app.status === 'Interview Scheduled' && app.interviewDate && (
                              <div className="mt-2 p-2 bg-indigo-900/30 border border-indigo-800/50 rounded-lg text-indigo-200 w-max">
                                <p className="font-medium mb-1 text-xs">📅 {app.interviewDate} @ {app.interviewTime}</p>
                                <a href={app.interviewLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors text-xs"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Join Meeting</a>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4"><a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline decoration-gray-500">View PDF</a></td>
                          <td className="px-6 py-4 text-right">
                            {app.status !== 'Hired' && (
                              <button onClick={() => handleWithdrawApplication(app._id)} className="text-red-400 hover:text-red-300 font-medium px-3 py-1 bg-red-900/20 rounded-lg border border-red-800/50 transition-colors text-xs">Withdraw</button>
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

          {studentView === 'opportunities' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-100">Open Opportunities</h2>
                <div className="relative w-full md:w-80">
                  <input type="text" placeholder="Search roles or enterprises..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm" />
                  <svg className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700 shadow-lg">
                  <p className="text-gray-400 text-lg">No job listings found matching "{searchTerm}"</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredJobs.map((job) => (
                    <div key={job._id} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col hover:border-gray-500 transition-colors shadow-lg group">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">{job.title}</h3>
                        <p className="text-gray-400 font-medium text-sm mt-1">{job.company?.name || 'Corporate Partner'}</p>
                      </div>
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">{job.description}</p>
                      <div className="mt-auto space-y-4">
                        <div className="flex justify-between items-center text-sm bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                          <span className="text-gray-300">📍 {job.location}</span>
                          <span className="font-semibold text-green-400">{job.salary || 'Unspecified'}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedJobId(job._id)}
                          disabled={hasApplied(job._id)}
                          className={`w-full font-medium py-3 rounded-xl transition-all shadow-sm ${hasApplied(job._id) ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-md hover:-translate-y-0.5'}`}
                        >
                          {hasApplied(job._id) ? 'Application Submitted' : 'Apply for Role'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedJobId && (
            <div className="fixed inset-0 pt-16 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full m-4">
                <h3 className="text-xl font-bold text-white mb-4">Upload Verification Documents</h3>
                <p className="text-gray-400 text-sm mb-6">Attach a PDF version of your resume to complete your application profile for this role.</p>
                <form onSubmit={submitApplication}>
                  <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-900/40 file:text-blue-300 hover:file:bg-blue-900/60 mb-6 cursor-pointer border border-gray-700 bg-gray-900/30 p-2 rounded-xl" required />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelectedJobId(null)} className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 font-medium rounded-xl hover:bg-gray-600 transition-colors" disabled={isApplying}>Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 transition-colors disabled:bg-blue-800 flex justify-center items-center shadow-md" disabled={isApplying}>{isApplying ? 'Uploading to Cloud...' : 'Submit Profile'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/*                        ADMIN VIEW                         */}
      {/* ========================================================= */}
      {user.role === 'admin' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => setAdminView('jobs')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${adminView === 'jobs' ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50' : 'bg-gray-800 border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${adminView === 'jobs' ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Manage Jobs</p>
                <h3 className="text-3xl font-bold text-white flex items-center gap-2">{totalJobs}</h3>
              </div>
            </button>
            <button onClick={() => setAdminView('applications')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${adminView === 'applications' ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/50' : 'bg-gray-800 border-gray-700 hover:border-purple-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${adminView === 'applications' ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Manage Applications</p>
                <h3 className="text-3xl font-bold text-white flex items-center gap-2">{totalApplications}</h3>
              </div>
            </button>
            <button onClick={() => setAdminView('hired')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${adminView === 'hired' ? 'bg-green-600/20 border-green-500 ring-2 ring-green-500/50' : 'bg-gray-800 border-gray-700 hover:border-green-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${adminView === 'hired' ? 'bg-green-600 text-white' : 'bg-green-900/50 text-green-400 group-hover:bg-green-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Students Hired</p>
                <h3 className="text-3xl font-bold text-white flex items-center gap-2">{hiredCount}</h3>
              </div>
            </button>
          </div>

          {adminView === 'jobs' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in space-y-6">
              <div className="flex justify-between items-center">
                <div><h3 className="text-xl font-bold text-white">Manage Corporate Postings</h3><p className="text-sm text-gray-400">Total control over ecosystem job listings.</p></div>
                <button onClick={() => setShowAdminJobForm(!showAdminJobForm)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  {showAdminJobForm ? 'Cancel Posting' : '+ Add New Job'}
                </button>
              </div>

              {showAdminJobForm && (
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                  <h4 className="text-lg font-bold text-white mb-4">Create Job Listing (Admin Mode)</h4>
                  <form onSubmit={handleCreateJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm text-gray-300 mb-1">Job Title</label><input type="text" required value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Location</label><input type="text" required value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Salary</label><input type="text" value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm text-gray-300 mb-1">Requirements</label><input type="text" required value={newJob.requirements} onChange={(e) => setNewJob({...newJob, requirements: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none focus:border-blue-500" /></div>
                    <div className="md:col-span-2"><label className="block text-sm text-gray-300 mb-1">Description</label><textarea required rows="3" value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white outline-none focus:border-blue-500"></textarea></div>
                    <div className="md:col-span-2"><button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg">Post Job to Network</button></div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Total Applied</th><th className="px-6 py-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {jobs.map((job) => {
                      const appsForThisJob = applications.filter(app => (typeof app.job === 'object' ? app.job?._id : app.job) === job._id);
                      return (
                        <tr key={job._id}>
                          <td className="px-6 py-4 font-semibold text-white">{job.title}</td>
                          <td className="px-6 py-4 text-blue-400">{job.company?.name || 'Internal'}</td>
                          <td className="px-6 py-4">{job.location}</td>
                          <td className="px-6 py-4">{appsForThisJob.length}</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteJob(job._id)} className="text-red-400 hover:text-red-300 font-medium px-3 py-1 bg-red-900/30 rounded-lg border border-red-800/50 transition-colors">Delete</button></td>
                        </tr>
                      );
                    })}
                    {jobs.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No active jobs found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-bold text-white">Manage Student Applications</h3><p className="text-sm text-gray-400">Terminate or manage application pipelines.</p></div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr><th className="px-6 py-4">Student</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Target Company</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {applications.map((app) => (
                      <tr key={app._id}>
                        <td className="px-6 py-4 font-semibold text-white">{app.student?.name}</td>
                        <td className="px-6 py-4">{app.job?.title}</td>
                        <td className="px-6 py-4">{app.job?.company?.name || 'Internal'}</td>
                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(app.status)}`}>{app.status}</span></td>
                        <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteApplication(app._id)} className="text-red-400 hover:text-red-300 font-medium px-3 py-1 bg-red-900/30 rounded-lg border border-red-800/50 transition-colors">Terminate</button></td>
                      </tr>
                    ))}
                    {applications.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No applications found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminView === 'hired' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-bold text-white">Campus Selection Roster</h3><p className="text-sm text-gray-400">Verified placements across the ecosystem.</p></div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr><th className="px-6 py-4">Selected Student</th><th className="px-6 py-4">Acquired Job Title</th><th className="px-6 py-4">Hiring Organization</th><th className="px-6 py-4">Verification State</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {hiredApplications.map((app) => (
                      <tr key={app._id} className="bg-green-950/10">
                        <td className="px-6 py-4 font-bold text-white">{app.student?.name}</td>
                        <td className="px-6 py-4 text-gray-200 font-medium">{app.job?.title}</td>
                        <td className="px-6 py-4 text-blue-400 font-semibold">{app.job?.company?.name || 'Internal'}</td>
                        <td className="px-6 py-4"><span className="text-xs text-green-400 font-semibold bg-green-900/30 px-2.5 py-1 rounded-md border border-green-800">✓ Offer Bound</span></td>
                      </tr>
                    ))}
                    {hiredApplications.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No hired students found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Application Status Breakdown</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#9ca3af' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6">Active Jobs per Company</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af'}} />
                      <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} cursor={{fill: '#374151', opacity: 0.4}} />
                      <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/*                       COMPANY VIEW                        */}
      {/* ========================================================= */}
      {user.role === 'company' && (
        <div className="space-y-8">
          
          {/* COMPANY NAVIGATION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => setCompanyView('post')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${companyView === 'post' ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50' : 'bg-gray-800 border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${companyView === 'post' ? 'bg-blue-600 text-white' : 'bg-blue-900/50 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">New Listing</p>
                <h3 className="text-xl font-bold text-white mt-1">Post a Job &rarr;</h3>
              </div>
            </button>

            <button onClick={() => setCompanyView('jobs')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${companyView === 'jobs' ? 'bg-green-600/20 border-green-500 ring-2 ring-green-500/50' : 'bg-gray-800 border-gray-700 hover:border-green-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${companyView === 'jobs' ? 'bg-green-600 text-white' : 'bg-green-900/50 text-green-400 group-hover:bg-green-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Manage Listings</p>
                <h3 className="text-xl font-bold text-white mt-1">My Posted Jobs &rarr;</h3>
              </div>
            </button>

            <button onClick={() => setCompanyView('applications')} className={`text-left p-6 rounded-2xl border transition-all flex items-center gap-4 shadow-lg group w-full ${companyView === 'applications' ? 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/50' : 'bg-gray-800 border-gray-700 hover:border-purple-500/50 hover:bg-gray-700/50'}`}>
              <div className={`p-4 rounded-xl transition-colors ${companyView === 'applications' ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'}`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium group-hover:text-gray-200">Candidate Pipeline</p>
                <h3 className="text-xl font-bold text-white mt-1">Received Apps &rarr;</h3>
              </div>
            </button>
          </div>

          {/* COMPANY TAB 1: POST A NEW JOB */}
          {companyView === 'post' && (
            <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl animate-fade-in max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Create Job Listing</h2>
              <form onSubmit={handleCreateJob} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Job Title</label><input type="text" required value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label><input type="text" required value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Salary / LPA</label><input type="text" value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Requirements</label><input type="text" required value={newJob.requirements} onChange={(e) => setNewJob({...newJob, requirements: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="React, Node, etc." /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label><textarea required rows="4" value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"></textarea></div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-md mt-4">Publish Job Listing</button>
              </form>
            </div>
          )}

          {/* COMPANY TAB 2: MY POSTED JOBS */}
          {companyView === 'jobs' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-xl font-bold text-white">Manage Corporate Postings</h3><p className="text-sm text-gray-400">View and withdraw jobs posted by your organization.</p></div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/70 text-gray-200 border-b border-gray-700">
                    <tr><th className="px-6 py-4">Job Title</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Salary Package</th><th className="px-6 py-4">Total Applied</th><th className="px-6 py-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                    {jobs.map((job) => {
                      const appsForThisJob = applications.filter(app => (typeof app.job === 'object' ? app.job?._id : app.job) === job._id);
                      return (
                        <tr key={job._id} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{job.title}</td>
                          <td className="px-6 py-4">{job.location}</td>
                          <td className="px-6 py-4">{job.salary || 'Unspecified'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-gray-900 text-gray-300 rounded-md font-bold text-xs border border-gray-700">
                              {appsForThisJob.length} Candidates
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDeleteJob(job._id)} className="text-red-400 hover:text-red-300 font-medium px-3 py-1.5 bg-red-900/20 rounded-lg border border-red-800/50 transition-colors text-xs">Withdraw Job</button>
                          </td>
                        </tr>
                      );
                    })}
                    {jobs.length === 0 && <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">You haven't posted any jobs yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPANY TAB 3: RECEIVED APPLICATIONS */}
          {companyView === 'applications' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl animate-fade-in">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-100">Recent Applicants</h2>
                <p className="text-sm text-gray-400">Review student submissions and update interview statuses.</p>
              </div>

              {applications.length === 0 ? (
                 <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-gray-700">
                   <p className="text-gray-400">No applications received for your job postings yet.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-700">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/70 text-gray-200 font-medium border-b border-gray-700">
                      <tr><th className="px-6 py-4">Applicant Name</th><th className="px-6 py-4">Role Applied For</th><th className="px-6 py-4">Resume</th><th className="px-6 py-4 text-right">Application Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/40">
                      {applications.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-white">{app.student?.name || 'Unknown Student'}</td>
                          <td className="px-6 py-4">{app.job?.title || 'Unknown Role'}</td>
                          <td className="px-6 py-4"><a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-medium decoration-blue-500/50">Review PDF</a></td>
                          <td className="px-6 py-4 text-right">
                            <select value={app.status} onChange={(e) => handleStatusChange(app._id, e.target.value)} className={`text-sm font-medium rounded-lg px-3 py-1.5 outline-none cursor-pointer border shadow-sm ${getStatusStyle(app.status)}`}>
                              <option value="Applied" className="bg-gray-800 text-white">Applied</option>
                              <option value="Reviewed" className="bg-gray-800 text-white">Reviewed</option>
                              <option value="Shortlisted" className="bg-gray-800 text-white">Shortlisted</option>
                              <option value="Interview Scheduled" className="bg-gray-800 text-white">Interview Scheduled</option>
                              <option value="Hired" className="bg-gray-800 text-white">Hired</option>
                              <option value="Rejected" className="bg-gray-800 text-white">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* COMPANY INTERVIEW MODAL */}
          {showInterviewModal && (
            <div className="fixed inset-0 pt-16 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
              <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full m-4">
                <h3 className="text-xl font-bold text-white mb-2">Schedule Interview</h3>
                <p className="text-gray-400 text-sm mb-6">Set the date, time, and provide a meeting link for the candidate.</p>
                <form onSubmit={handleScheduleInterview} className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Date</label><input type="date" required className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 outline-none" value={interviewDetails.date} onChange={(e) => setInterviewDetails({...interviewDetails, date: e.target.value})}/></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Time</label><input type="time" required className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 outline-none" value={interviewDetails.time} onChange={(e) => setInterviewDetails({...interviewDetails, time: e.target.value})}/></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-1.5">Meeting Link</label><input type="url" required placeholder="https://meet.google.com/..." className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder-gray-500" value={interviewDetails.link} onChange={(e) => setInterviewDetails({...interviewDetails, link: e.target.value})}/></div>
                  <div className="flex gap-3 pt-5">
                    <button type="button" onClick={() => {setShowInterviewModal(false); setSelectedAppForInterview(null);}} className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-200 font-medium rounded-xl hover:bg-gray-600 transition-colors">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-colors shadow-md">Send Invite</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;