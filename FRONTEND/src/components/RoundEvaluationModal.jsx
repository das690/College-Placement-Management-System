import React, { useState } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';
import { validateRoundEvaluation } from '../utils/validation';

const DEFAULT_ROUND_TYPES = [
  'Application Screening',
  'Online Aptitude & Coding Test',
  'Technical Interview 1',
  'Technical Interview 2',
  'System Design Round',
  'Managerial Assessment',
  'HR & Culture Fit Round'
];

const RoundEvaluationModal = ({ application, onClose, onSuccess }) => {
  const rounds = application?.rounds || [];
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [roundForm, setRoundForm] = useState({
    roundName: 'Technical Interview 1',
    roundNumber: (rounds.length || 0) + 1,
    status: 'Cleared',
    score: '',
    feedback: '',
    evaluator: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSelectRoundToEdit = (r) => {
    setEditingRoundId(r._id);
    setRoundForm({
      roundName: r.roundName || '',
      roundNumber: r.roundNumber || 1,
      status: r.status || 'Cleared',
      score: r.score || '',
      feedback: r.feedback || '',
      evaluator: r.evaluator || ''
    });
    setErrors({});
  };

  const handleResetForm = () => {
    setEditingRoundId(null);
    setRoundForm({
      roundName: 'Technical Interview 1',
      roundNumber: (rounds.length || 0) + 1,
      status: 'Cleared',
      score: '',
      feedback: '',
      evaluator: ''
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateRoundEvaluation(roundForm);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      return toast.error(firstError);
    }
    setErrors({});

    try {
      setLoading(true);
      const payload = {
        roundId: editingRoundId || undefined,
        ...roundForm
      };

      const res = await API.post(`/applications/${application._id}/rounds`, payload);
      toast.success(editingRoundId ? 'Round evaluation updated!' : 'Round feedback recorded successfully!');
      if (onSuccess) onSuccess(res.data);
      handleResetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record round evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to remove this round evaluation record?')) return;
    try {
      setLoading(true);
      const res = await API.delete(`/applications/${application._id}/rounds/${roundId}`);
      toast.success('Round evaluation removed');
      if (onSuccess) onSuccess(res.data);
      if (editingRoundId === roundId) handleResetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete round evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 pt-16 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl p-6 md:p-8 space-y-6 my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-900/40 text-blue-400 rounded-xl text-lg">📝</span>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Round Evaluations: <span className="text-blue-400">{application.student?.name || 'Candidate'}</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Role: <strong className="text-gray-300">{application.job?.title}</strong> | Org: <strong className="text-gray-300">{application.job?.company?.name || 'Company'}</strong>
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Existing Rounds Timeline Summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Recorded Rounds ({rounds.length})</h4>
            {editingRoundId && (
              <button
                onClick={handleResetForm}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                + Switch to Add New Round
              </button>
            )}
          </div>

          {rounds.length === 0 ? (
            <p className="text-xs text-gray-500 italic bg-gray-950/50 p-4 rounded-xl border border-gray-800">
              No specific round evaluations submitted yet. Add the first round assessment below.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {rounds.map((r) => (
                <div
                  key={r._id}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    editingRoundId === r._id
                      ? 'bg-blue-950/40 border-blue-500'
                      : 'bg-gray-800/80 border-gray-700/80 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1 mb-1">
                      <span className="font-bold text-white">{r.roundName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Cleared' ? 'bg-green-950 text-green-400 border border-green-800' :
                        r.status === 'Failed' ? 'bg-red-950 text-red-400 border border-red-800' :
                        r.status === 'On-Hold' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                        'bg-blue-950 text-blue-400 border border-blue-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    {r.score && <p className="text-purple-300 font-semibold mb-1">Score: {r.score}</p>}
                    {r.feedback && <p className="text-gray-400 line-clamp-2 italic">"{r.feedback}"</p>}
                  </div>

                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-700/60">
                    <span className="text-[10px] text-gray-500">By {r.evaluator || 'Recruiter'}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectRoundToEdit(r)}
                        className="text-blue-400 hover:text-blue-300 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRound(r._id)}
                        className="text-red-400 hover:text-red-300 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="bg-gray-950/70 p-5 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5">
              <span>{editingRoundId ? '✏️ Edit Round Details' : '➕ Record New Round Assessment'}</span>
            </h4>
            <span className="text-xs text-gray-400">Round #{roundForm.roundNumber}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Round Name / Stage</label>
              <input
                type="text"
                required
                list="roundTypeSuggestions"
                value={roundForm.roundName}
                onChange={(e) => setRoundForm({ ...roundForm, roundName: e.target.value })}
                placeholder="e.g. Technical Round 1"
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
              />
              <datalist id="roundTypeSuggestions">
                {DEFAULT_ROUND_TYPES.map((t) => <option key={t} value={t} />)}
              </datalist>
              {errors.roundName && <p className="text-xs text-red-400 mt-1">{errors.roundName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Round Status / Decision</label>
              <select
                value={roundForm.status}
                onChange={(e) => setRoundForm({ ...roundForm, status: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
              >
                <option value="Cleared">Cleared / Passed</option>
                <option value="On-Hold">On-Hold / Under Review</option>
                <option value="Pending">Pending / In Progress</option>
                <option value="Failed">Failed / Not Selected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Score / Rating (Optional)</label>
              <input
                type="text"
                value={roundForm.score}
                onChange={(e) => setRoundForm({ ...roundForm, score: e.target.value })}
                placeholder="e.g. 85/100, 4.5/5"
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Detailed Feedback & Evaluation Notes (Visible to Candidate)
            </label>
            <textarea
              rows="3"
              value={roundForm.feedback}
              onChange={(e) => setRoundForm({ ...roundForm, feedback: e.target.value })}
              placeholder="Provide constructive feedback (e.g. Strong problem-solving in algorithms; suggested improvement in SQL indexing)..."
              className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Evaluator / Panel Name</label>
              <input
                type="text"
                value={roundForm.evaluator}
                onChange={(e) => setRoundForm({ ...roundForm, evaluator: e.target.value })}
                placeholder="e.g. Tech Lead - John"
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Round Sequence #</label>
              <input
                type="number"
                min="1"
                value={roundForm.roundNumber}
                onChange={(e) => setRoundForm({ ...roundForm, roundNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {editingRoundId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Saving Evaluation...' : (editingRoundId ? 'Update Round Evaluation' : 'Submit Round Feedback')}
            </button>
          </div>
        </form>

        {/* Modal Close */}
        <div className="flex justify-end pt-2 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default RoundEvaluationModal;
