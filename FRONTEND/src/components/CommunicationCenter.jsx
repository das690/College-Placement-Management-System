import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';
import { validateCommunication } from '../utils/validation';
import { COLLEGE_DEPARTMENTS } from '../utils/departments';

const QUICK_TEMPLATES = [
  {
    label: '🎯 Shortlist Announcement',
    title: 'Recruitment Shortlist & Next Round Notice',
    type: 'Round Result',
    targetAudience: 'Job Applicants',
    message: 'Congratulations to the candidates shortlisted for the upcoming technical round! Please ensure your system and development environment are ready. Check your application tracker for round feedback.'
  },
  {
    label: '📅 Interview Schedule Alert',
    title: 'Upcoming Video Interview Guidelines',
    type: 'Interview Update',
    targetAudience: 'Shortlisted Candidates',
    message: 'Interview slots have been scheduled for our position. Please log in to your dashboard to review your exact interview date, time, and meeting link.'
  },
  {
    label: '📢 Campus Drive Opening',
    title: 'New Campus Placement Drive Initialized',
    type: 'Announcement',
    targetAudience: 'All Students',
    message: 'A new placement drive has commenced. Students are encouraged to verify their academic profile details (CGPA, Department, Resume PDF) and explore open positions.'
  },
  {
    label: '⚠️ Document Verification',
    title: 'Urgent: Complete Profile & Document Upload',
    type: 'Urgent Notice',
    targetAudience: 'All Students',
    isUrgent: true,
    message: 'Please ensure your latest academic resume PDF is uploaded to your profile before applying to positions. Incomplete profiles will be rejected by the automated eligibility engine.'
  }
];

const CommunicationCenter = ({ user, jobs = [], drives = [] }) => {
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [showComposer, setShowComposer] = useState(false);

  const canPost = user?.role === 'admin' || user?.role === 'company';

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'Announcement',
    targetAudience: user?.role === 'company' ? 'Job Applicants' : 'All Students',
    jobId: '',
    driveId: '',
    targetDepartment: 'ALL',
    actionUrl: '',
    isUrgent: false
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const res = await API.get('/communications');
      setCommunications(res.data);
    } catch (err) {
      toast.error('Failed to load announcements: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  const handleApplyTemplate = (tmpl) => {
    setFormData((prev) => ({
      ...prev,
      title: tmpl.title,
      type: tmpl.type,
      targetAudience: tmpl.targetAudience || 'All Students',
      message: tmpl.message,
      isUrgent: !!tmpl.isUrgent
    }));
    setShowComposer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateCommunication(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setErrors({});

    try {
      setSubmitting(true);
      const res = await API.post('/communications', formData);
      toast.success('Announcement broadcasted successfully to candidates!');
      setCommunications([res.data, ...communications]);
      setFormData({
        title: '',
        message: '',
        type: 'Announcement',
        targetAudience: 'All Students',
        jobId: '',
        driveId: '',
        targetDepartment: 'ALL',
        actionUrl: '',
        isUrgent: false
      });
      setShowComposer(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this broadcast announcement?')) return;
    try {
      await API.delete(`/communications/${id}`);
      setCommunications(communications.filter((c) => c._id !== id));
      toast.success('Announcement removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const filteredCommunications = communications.filter((c) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'URGENT') return c.isUrgent || c.type === 'Urgent Notice';
    return c.type === filterType;
  });

  const getTypeBadge = (type, isUrgent) => {
    if (isUrgent || type === 'Urgent Notice') {
      return 'bg-red-950 text-red-300 border-red-800 animate-pulse';
    }
    switch (type) {
      case 'Interview Update':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'Round Result':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'General Guidance':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'Announcement':
      default:
        return 'bg-blue-950 text-blue-300 border-blue-800';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-900/40 text-blue-400 rounded-xl text-xl">📢</span>
            <h2 className="text-2xl font-bold text-white">Communication & Announcement Center</h2>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Official announcements, round result updates, and direct broadcast notices for recruitment drives
          </p>
        </div>

        {canPost && (
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
          >
            <span>{showComposer ? '✕ Close Composer' : '➕ Broadcast New Announcement'}</span>
          </button>
        )}
      </div>

      {/* Composer for Admin & Recruiter */}
      {canPost && showComposer && (
        <div className="bg-gray-800/95 p-6 md:p-8 rounded-2xl border border-blue-500/50 shadow-2xl space-y-5 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-700 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📝 Compose Candidate Announcement</span>
              </h3>
              <p className="text-xs text-gray-400">Target announcements by drive, position, department, or candidate shortlist</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-950 text-blue-300 rounded-lg border border-blue-800">
              Broadcasting as: <strong>{user.name} ({user.role})</strong>
            </span>
          </div>

          {/* Quick Pre-filled Templates */}
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">⚡ Quick Templates:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-blue-950/80 text-gray-300 hover:text-blue-300 rounded-xl text-xs border border-gray-700 hover:border-blue-500/50 transition-all"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Technical Round 1 Shortlist Released"
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Notice Category / Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                >
                  <option value="Announcement">📢 General Announcement</option>
                  <option value="Interview Update">📅 Interview Update & Instructions</option>
                  <option value="Round Result">🎯 Round Result / Shortlist Alert</option>
                  <option value="Urgent Notice">⚠️ Urgent Action Required</option>
                  <option value="General Guidance">💡 Guidance & Preparation Tips</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Target Recipient Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                >
                  {user?.role === 'admin' && <option value="All Students">🌐 All Registered Students (Admin)</option>}
                  {user?.role === 'admin' && <option value="Specific Department">🏛️ Specific Department Students (Admin)</option>}
                  <option value="Job Applicants">👥 Position Specific Applicants</option>
                  <option value="Shortlisted Candidates">⭐ Shortlisted / Interview Candidates</option>
                </select>
              </div>

              {user?.role === 'admin' && formData.targetAudience === 'Specific Department' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Select Department</label>
                  <select
                    value={formData.targetDepartment}
                    onChange={(e) => setFormData({ ...formData, targetDepartment: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Departments</option>
                    {COLLEGE_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.name}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(formData.targetAudience === 'Job Applicants' || formData.targetAudience === 'Shortlisted Candidates') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Select Related Position</label>
                  <select
                    value={formData.jobId}
                    onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">-- All Active Positions --</option>
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} ({j.company?.name || 'Company'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Detailed Message Content</label>
              <textarea
                required
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write message body with clear dates, guidelines, or instructions..."
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500"
              ></textarea>
              {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.isUrgent}
                  onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  className="rounded bg-gray-900 border-gray-700 text-red-500 focus:ring-red-500 h-4 w-4"
                />
                <span className="text-red-400 font-bold">⚠️ Mark as High Priority / Urgent Notice</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Broadcast Announcement'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            All Notices ({communications.length})
          </button>
          <button
            onClick={() => setFilterType('URGENT')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'URGENT' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-800 text-red-400 hover:text-red-300'
            }`}
          >
            ⚠️ High Priority / Urgent
          </button>
          <button
            onClick={() => setFilterType('Interview Update')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'Interview Update' ? 'bg-cyan-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            📅 Interview Updates
          </button>
          <button
            onClick={() => setFilterType('Round Result')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'Round Result' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            🎯 Round Results & Shortlists
          </button>
        </div>

        <button
          onClick={fetchCommunications}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          <span>🔄 Refresh Feed</span>
        </button>
      </div>

      {/* Stream of Announcements */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading announcements feed...</div>
      ) : filteredCommunications.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/80 rounded-2xl border border-gray-700 shadow-xl space-y-2">
          <div className="text-3xl">📭</div>
          <h3 className="text-base font-bold text-white">No Announcements in this Category</h3>
          <p className="text-xs text-gray-400">Broadcast messages from recruitment teams and college admins will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCommunications.map((item) => (
            <div
              key={item._id}
              className={`p-6 rounded-2xl border transition-all shadow-lg space-y-3 ${
                item.isUrgent
                  ? 'bg-gradient-to-r from-red-950/40 via-gray-800 to-gray-800 border-red-700/80'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTypeBadge(item.type, item.isUrgent)}`}>
                      {item.type}
                    </span>
                    <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/60">
                      To: {item.targetAudience}
                      {item.targetDepartment && item.targetDepartment !== 'ALL' && ` (${item.targetDepartment})`}
                    </span>
                    {item.job?.title && (
                      <span className="text-xs text-gray-300 bg-gray-900 px-2 py-0.5 rounded-md border border-gray-700">
                        💼 Role: {item.job.title}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {(user.role === 'admin' || item.sender === user._id) && (
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950 rounded transition-colors ml-2"
                      title="Delete announcement"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                {item.message}
              </p>

              <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Posted by: <strong className="text-gray-200">{item.senderName} ({item.senderRole === 'admin' ? 'Placement Cell' : 'Recruiting Company'})</strong>
                </span>
                {item.actionUrl && (
                  <a
                    href={item.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-bold underline"
                  >
                    View Resource &rarr;
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default CommunicationCenter;
