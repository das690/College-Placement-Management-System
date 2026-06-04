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

  // NEW: State for the search bar
  const [searchTerm, setSearchTerm] = useState('');

  const [newJob, setNewJob] = useState({
    title: '', description: '', requirements: '', location: '', salary: ''
  });

  const [selectedJobId, setSelectedJobId] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedAppForInterview, setSelectedAppForInterview] = useState(null);
  const [interviewDetails, setInterviewDetails] = useState({ date: '', time: '', link: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          API.get('/jobs'),
          API.get('/applications')
        ]);
        
        const allJobs = jobsRes.data;
        let allApps = appsRes.data;

        allApps = allApps.map(app => {
          const jobId = typeof app.job === 'object' ? app.job?._id : app.job;
          const fullJobDetails = allJobs.find(j => j._id === jobId);
          return {
            ...app,
            job: fullJobDetails || app.job
          };
        });

        if (user.role === 'student' || user.role === 'admin') {
          setJobs(allJobs);
          setApplications(allApps);
        } else if (user.role === 'company') {
          const myJobs = allJobs.filter(job => {
             const compId = typeof job.company === 'object' ? job.company?._id : job.company;
             return compId === user._id;
          });
          setJobs(myJobs);

          const myJobIds = myJobs.map(j => j._id);
          const myApps = allApps.filter(app => {
             const appId = typeof app.job === 'object' ? app.job?._id : app.job;
             return myJobIds.includes(appId);
          });
          setApplications(myApps);
        }
      } catch (error) {
        toast.error("Failed to fetch dashboard data");
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!resumeFile) return toast.error("Please select a PDF resume");
    
    setIsApplying(true);
    // Use toast.promise for a beautiful loading state!
    const applyPromise = async () => {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      const uploadRes = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const resumeUrl = uploadRes.data.resumeUrl;
      await API.post('/applications', { jobId: selectedJobId, resumeUrl });
    };

    toast.promise(applyPromise(), {
      loading: 'Uploading resume and applying...',
      success: 'Successfully applied to the job!',
      error: (err) => err.response?.data?.message || 'Failed to apply'
    }).then(() => {
      setSelectedJobId(null);
      setResumeFile(null);
      setTimeout(() => window.location.reload(), 1000);
    }).finally(() => {
      setIsApplying(false);
    });
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await API.post('/jobs', newJob);
      // REPLACED alert WITH toast
      toast.success('Job posted successfully!');
      setNewJob({ title: '', description: '', requirements: '', location: '', salary: '' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post job');
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    if (newStatus === 'Interview Scheduled') {
      setSelectedAppForInterview(appId);
      setShowInterviewModal(true);
      return; 
    }

    try {
      await API.put(`/applications/${appId}/status`, { status: newStatus });
      toast.success('Applicant status updated!');
      setTimeout(() => window.location.reload(), 1000);
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
      
      toast.success('Interview scheduled and sent to student!');
      setShowInterviewModal(false);
      setInterviewDetails({ date: '', time: '', link: '' }); 
      setSelectedAppForInterview(null);
      setTimeout(() => window.location.reload(), 1000);
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

  // ================= ADMIN ANALYTICS LOGIC =================
  const totalJobs = jobs.length;
  const totalApplications = applications.length;
  const hiredCount = applications.filter(app => app.status === 'Hired').length;

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

  // NEW: Filter jobs based on search term for the student view
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (job.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors group mb-2"
      >
        <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      <header className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome back, {user.name}. You are logged in as a <span className="font-semibold text-blue-400 uppercase">{user.role}</span>.
        </p>
      </header>

      {/* ================= ADMIN VIEW ================= */}
      {user.role === 'admin' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-blue-900/50 rounded-xl text-blue-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Active Jobs</p>
                <h3 className="text-3xl font-bold text-white">{totalJobs}</h3>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-purple-900/50 rounded-xl text-purple-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Applications</p>
                <h3 className="text-3xl font-bold text-white">{totalApplications}</h3>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-green-900/50 rounded-xl text-green-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Students Hired</p>
                <h3 className="text-3xl font-bold text-white">{hiredCount}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6">Application Status Breakdown</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
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
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                      cursor={{fill: '#374151', opacity: 0.4}}
                    />
                    <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STUDENT VIEW ================= */}
      {user.role === 'student' && (
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Your Applications</h2>
            {applications.length === 0 ? (
              <p className="text-gray-400 bg-gray-800 p-6 rounded-xl border border-gray-700">You haven't applied to any jobs yet.</p>
            ) : (
              <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-900/50 text-gray-300 font-medium border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4">Job Title</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Status & Next Steps</th>
                      <th className="px-6 py-4">Applied On</th>
                      <th className="px-6 py-4">Resume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {applications.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{app.job?.title || 'Unknown Role'}</td>
                        <td className="px-6 py-4">{app.job?.company?.name || 'Unknown Company'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border inline-block mb-2 ${getStatusStyle(app.status)}`}>
                            {app.status}
                          </span>
                          
                          {app.status === 'Interview Scheduled' && app.interviewDate && (
                            <div className="mt-1 p-3 bg-indigo-900/30 border border-indigo-800/50 rounded-lg text-indigo-200">
                              <p className="font-medium mb-1">📅 {app.interviewDate} @ {app.interviewTime}</p>
                              <a href={app.interviewLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                Join Meeting
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">{new Date(app.appliedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">View PDF</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Available Opportunities</h2>
              
              {/* NEW: Search Bar UI */}
              <div className="relative w-full md:w-72">
                <input 
                  type="text" 
                  placeholder="Search jobs or companies..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>

            {/* Changed from jobs.map to filteredJobs.map */}
            {filteredJobs.length === 0 ? (
              <p className="text-gray-400 text-center py-10 bg-gray-800 rounded-xl border border-gray-700">No jobs found matching "{searchTerm}"</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <div key={job._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col hover:border-gray-600 transition-colors shadow-lg">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white line-clamp-1">{job.title}</h3>
                      <p className="text-blue-400 font-medium text-sm">{job.company?.name || 'Unknown Company'}</p>
                    </div>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-grow">{job.description}</p>
                    <div className="mt-auto space-y-4">
                      <div className="flex justify-between items-center text-sm text-gray-400 bg-gray-900/50 p-3 rounded-lg">
                        <span>📍 {job.location}</span>
                        <span className="font-medium text-green-400">{job.salary}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedJobId(job._id)}
                        disabled={hasApplied(job._id)}
                        className={`w-full font-medium py-2.5 rounded-lg transition-all ${
                          hasApplied(job._id) 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        {hasApplied(job._id) ? 'Applied' : 'Apply Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RESUME UPLOAD MODAL */}
          {selectedJobId && (
            <div className="fixed inset-0 pt-16 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full m-4">
                <h3 className="text-xl font-bold text-white mb-4">Upload Your Resume</h3>
                <p className="text-gray-400 text-sm mb-6">Please upload a PDF version of your resume to complete your application.</p>
                
                <form onSubmit={submitApplication}>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-900 mb-6 cursor-pointer"
                    required
                  />
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setSelectedJobId(null)}
                      className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors"
                      disabled={isApplying}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition-colors disabled:bg-blue-800 flex justify-center items-center"
                      disabled={isApplying}
                    >
                      {isApplying ? 'Uploading...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= COMPANY VIEW ================= */}
      {user.role === 'company' && (
        <div className="grid md:grid-cols-3 gap-8">
          <section className="md:col-span-1">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4">Post a New Job</h2>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Job Title</label>
                  <input type="text" required value={newJob.title} onChange={(e) => setNewJob({...newJob, title: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input type="text" required value={newJob.location} onChange={(e) => setNewJob({...newJob, location: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Salary / LPA</label>
                  <input type="text" value={newJob.salary} onChange={(e) => setNewJob({...newJob, salary: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Requirements</label>
                  <input type="text" required value={newJob.requirements} onChange={(e) => setNewJob({...newJob, requirements: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="React, Node, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea required rows="3" value={newJob.description} onChange={(e) => setNewJob({...newJob, description: e.target.value})} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors">
                  Post Job
                </button>
              </form>
            </div>
          </section>

          <section className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-4">Recent Applicants</h2>
              {applications.length === 0 ? (
                 <p className="text-gray-400 bg-gray-800 p-6 rounded-xl border border-gray-700">No applications received yet.</p>
              ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/50 text-gray-300 font-medium border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4">Applicant Name</th>
                        <th className="px-6 py-4">Role Applied For</th>
                        <th className="px-6 py-4">Resume</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {applications.map((app) => (
                        <tr key={app._id} className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{app.student?.name || 'Unknown Student'}</td>
                          <td className="px-6 py-4">{app.job?.title || 'Unknown Role'}</td>
                          <td className="px-6 py-4">
                            <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">View Resume</a>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={app.status}
                              onChange={(e) => handleStatusChange(app._id, e.target.value)}
                              className={`text-sm font-medium rounded-full px-3 py-1 outline-none cursor-pointer border bg-gray-800 ${getStatusStyle(app.status)}`}
                            >
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

            {/* INTERVIEW SCHEDULING MODAL */}
            {showInterviewModal && (
              <div className="fixed inset-0 pt-16 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full m-4">
                  <h3 className="text-xl font-bold text-white mb-2">Schedule Interview</h3>
                  <p className="text-gray-400 text-sm mb-6">Set the date, time, and provide a meeting link for the candidate.</p>
                  
                  <form onSubmit={handleScheduleInterview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={interviewDetails.date}
                        onChange={(e) => setInterviewDetails({...interviewDetails, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
                      <input 
                        type="time" 
                        required 
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={interviewDetails.time}
                        onChange={(e) => setInterviewDetails({...interviewDetails, time: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Meeting Link (Google Meet, Zoom, etc.)</label>
                      <input 
                        type="url" 
                        required 
                        placeholder="https://meet.google.com/..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={interviewDetails.link}
                        onChange={(e) => setInterviewDetails({...interviewDetails, link: e.target.value})}
                      />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowInterviewModal(false);
                          setSelectedAppForInterview(null);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 font-medium rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors"
                      >
                        Send Invite
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;