import React from 'react';
import { SessionSummary } from '../types';
import { X, Download, BarChart3, Users, Clock, Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface SessionSummaryModalProps {
  summary: SessionSummary;
  onClose: () => void;
}

export default function SessionSummaryModal({ summary, onClose }: SessionSummaryModalProps) {
  // Export functions
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(summary, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-summary-${summary.sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    // Create CSV for stories
    const csvRows = [
      ['Story ID', 'Title', 'Final Estimate', 'Voting Rounds', 'Consensus Reached', 'Votes'],
      ...summary.stories.map(story => [
        story.storyId,
        story.title,
        story.finalEstimate,
        story.votingRounds.toString(),
        story.consensusReached ? 'Yes' : 'No',
        story.votes.map(v => `${v.userId}:${v.vote}`).join(';')
      ])
    ];
    
    const csvContent = csvRows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-summary-${summary.sessionId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Session Summary - ${summary.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
            .metric { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .stories { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Planning Poker Session Summary</h1>
            <h2>${summary.title}</h2>
            <p><strong>Duration:</strong> ${Math.round(summary.duration)} minutes</p>
            <p><strong>Created by:</strong> ${summary.createdBy}</p>
          </div>
          
          <div class="metrics">
            <div class="metric">
              <h3>Total Stories</h3>
              <p>${summary.stories.length}</p>
            </div>
            <div class="metric">
              <h3>Participants</h3>
              <p>${summary.participants.length}</p>
            </div>
            <div class="metric">
              <h3>Total Votes</h3>
              <p>${summary.totalVotes}</p>
            </div>
            <div class="metric">
              <h3>Consensus Rate</h3>
              <p>${Math.round((summary.stories.filter(s => s.consensusReached).length / summary.stories.length) * 100)}%</p>
            </div>
          </div>

          <div class="stories">
            <h3>Story Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Story</th>
                  <th>Final Estimate</th>
                  <th>Voting Rounds</th>
                  <th>Consensus</th>
                </tr>
              </thead>
              <tbody>
                ${summary.stories.map(story => `
                  <tr>
                    <td>${story.title}</td>
                    <td>${story.finalEstimate}</td>
                    <td>${story.votingRounds}</td>
                    <td>${story.consensusReached ? 'Yes' : 'No'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="participants">
            <h3>Participant Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Total Votes</th>
                  <th>Participation Rate</th>
                </tr>
              </thead>
              <tbody>
                ${summary.participants.map(p => `
                  <tr>
                    <td>${p.username}</td>
                    <td>${p.totalVotes}</td>
                    <td>${Math.round(p.participationRate * 100)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Calculate summary stats
  const consensusRate = summary.stories.length > 0 
    ? (summary.stories.filter(s => s.consensusReached).length / summary.stories.length) * 100 
    : 0;
  
  const avgParticipationRate = summary.participants.length > 0
    ? summary.participants.reduce((sum, p) => sum + p.participationRate, 0) / summary.participants.length * 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{summary.title}</h2>
            <p className="text-gray-600">Session Summary & Analytics</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={exportAsJSON}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={exportAsCSV}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={exportAsPDF}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Duration</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{Math.round(summary.duration)}m</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Stories</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{summary.stories.length}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Participants</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{summary.participants.length}</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Consensus Rate</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{Math.round(consensusRate)}%</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Consensus Chart */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Story Consensus
              </h3>
              <div className="space-y-2">
                {summary.stories.map((story, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium truncate flex-1 mr-2">{story.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{story.finalEstimate}</span>
                      {story.consensusReached ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Participation Chart */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participation Rates
              </h3>
              <div className="space-y-2">
                {summary.participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-sm font-medium">{participant.username}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${participant.participationRate * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {Math.round(participant.participationRate * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analytics</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Total Votes Cast:</span>
                <p className="text-gray-900">{summary.totalVotes}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Average Voting Time:</span>
                <p className="text-gray-900">{summary.averageVotingTime}s</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Average Participation:</span>
                <p className="text-gray-900">{Math.round(avgParticipationRate)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
