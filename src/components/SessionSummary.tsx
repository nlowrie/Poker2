import { SessionSummary as SessionSummaryType } from '../types';
import { X, Users, Clock, TrendingUp, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface SessionSummaryProps {
  summary: SessionSummaryType;
  onClose: () => void;
  onExport?: () => void;
}

export default function SessionSummary({ 
  summary, 
  onClose, 
  onExport 
}: SessionSummaryProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const consensusRate = Math.round((summary.stories.filter(s => s.consensusReached).length / summary.stories.length) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Session Summary</h2>
            <p className="text-gray-600 mt-1">{summary.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Session Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="mr-2" size={20} />
              Session Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(summary.duration)}
                </div>
                <div className="text-sm text-blue-600">Duration</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {summary.totalVotes}
                </div>
                <div className="text-sm text-green-600">Total Votes</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {consensusRate}%
                </div>
                <div className="text-sm text-purple-600">Consensus Rate</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.stories.length}
                </div>
                <div className="text-sm text-orange-600">Stories</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <strong>Started:</strong> {formatDate(summary.startTime)}
              </div>
              <div>
                <strong>Ended:</strong> {formatDate(summary.endTime)}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="mr-2" size={20} />
              Participants ({summary.participants.length})
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid gap-3">
                {summary.participants.map(participant => (
                  <div key={participant.userId} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <div className="font-medium text-gray-900">{participant.username}</div>
                      <div className="text-sm text-gray-500">{participant.totalVotes} votes</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {participant.participationRate}%
                      </div>
                      <div className="text-xs text-gray-500">participation</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stories */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2" size={20} />
              Stories Estimated ({summary.stories.length})
            </h3>
            <div className="space-y-4">
              {summary.stories.map(story => (
                <div key={story.storyId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{story.title}</h4>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                        <span>Final Estimate: <strong>{story.finalEstimate}</strong></span>
                        <span>Votes: {story.votes.length}</span>
                        <span>Rounds: {story.votingRounds}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {story.consensusReached ? (
                        <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                          <CheckCircle size={14} className="mr-1" />
                          Consensus
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs">
                          <AlertCircle size={14} className="mr-1" />
                          No Consensus
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Votes */}
                  <div className="flex flex-wrap gap-2">
                    {story.votes.map((vote, index) => (
                      <span
                        key={`${vote.userId}-${index}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {vote.vote}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Session completed on {formatDate(summary.endTime)}
          </div>
          <div className="flex space-x-3">
            {onExport && (
              <button
                onClick={onExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download size={16} className="mr-2" />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
