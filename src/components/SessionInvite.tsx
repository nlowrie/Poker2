import React, { useState } from 'react';
import { Copy, Share, Users, Check } from 'lucide-react';

interface SessionInviteProps {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}

export default function SessionInvite({ sessionId, sessionName, onClose }: SessionInviteProps) {
  const [copied, setCopied] = useState(false);
  
  const inviteUrl = `${window.location.origin}/join/${sessionId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Invitation to Planning Session: ${sessionName}`);
    const body = encodeURIComponent(
      `You've been invited to join the planning session "${sessionName}".\n\n` +
      `Click the link below to join:\n${inviteUrl}\n\n` +
      `If you don't have an account, you'll be able to create one when you click the link.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <Share className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invite Team Members</h2>
          <p className="text-gray-600">Share this link to invite team members to "{sessionName}"</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitation Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={shareViaEmail}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" />
            Share via Email
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Team members click the link</li>
            <li>• They create an account or sign in</li>
            <li>• They're automatically joined to this session</li>
            <li>• They can start voting on backlog items</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
