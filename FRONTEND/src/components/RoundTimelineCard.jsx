import React from 'react';

const RoundTimelineCard = ({ application, onEvaluate, isRecruiter = false, isWithdrawn = false }) => {
  const rounds = application.rounds || [];
  
  const getRoundStatusBadge = (status) => {
    switch (status) {
      case 'Cleared':
        return 'bg-green-950 text-green-400 border-green-800';
      case 'Failed':
        return 'bg-red-950 text-red-400 border-red-800';
      case 'On-Hold':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800';
      case 'Pending':
      default:
        return 'bg-blue-950 text-blue-400 border-blue-800';
    }
  };

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-gray-700/80 p-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-900/40 text-blue-400 rounded-lg text-sm">🎯</span>
          <div>
            <h4 className="text-sm font-bold text-white">Evaluation Timeline & Round Feedback</h4>
            <p className="text-xs text-gray-400">{rounds.length} evaluation stage(s) recorded</p>
          </div>
        </div>

        {isRecruiter && !isWithdrawn && onEvaluate && (
          <button
            onClick={() => onEvaluate(application)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span>➕ Add / Edit Round Feedback</span>
          </button>
        )}
      </div>

      {rounds.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-950/40 rounded-xl border border-gray-800/60">
          Initial screening in progress. Detailed round evaluations will appear here once submitted by the recruiter.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
          {rounds.map((round, idx) => (
            <div key={round._id || idx} className="relative group">
              {/* Dot */}
              <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                round.status === 'Cleared' ? 'bg-green-500 ring-4 ring-green-950' :
                round.status === 'Failed' ? 'bg-red-500 ring-4 ring-red-950' :
                round.status === 'On-Hold' ? 'bg-yellow-500 ring-4 ring-yellow-950' :
                'bg-blue-500 ring-4 ring-blue-950'
              }`}></div>

              <div className="bg-gray-800/90 p-4 rounded-xl border border-gray-700/60 hover:border-gray-600 transition-all shadow-md space-y-2">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400 mr-2">Round {round.roundNumber || idx + 1}:</span>
                    <span className="text-sm font-bold text-white">{round.roundName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {round.score && (
                      <span className="px-2.5 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-800/60 rounded-md text-xs font-bold">
                        Score: {round.score}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getRoundStatusBadge(round.status)}`}>
                      {round.status}
                    </span>
                  </div>
                </div>

                {round.feedback && (
                  <div className="bg-gray-950/70 p-3 rounded-lg border border-gray-800 text-xs text-gray-300">
                    <p className="font-semibold text-gray-400 mb-0.5 text-[11px] uppercase tracking-wider">Recruiter Feedback & Notes:</p>
                    <p className="italic text-gray-200">"{round.feedback}"</p>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
                  <span>Evaluator: <strong className="text-gray-300">{round.evaluator || 'Recruitment Panel'}</strong></span>
                  <span>{round.updatedAt ? new Date(round.updatedAt).toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoundTimelineCard;
