import { useState } from 'react';
import { Video, Settings, Copy, Clock, Users, PhoneOff } from 'lucide-react';

interface VideoConferenceTestProps {
  sessionId: string;
  onClose?: () => void;
}

export default function VideoConferenceTest({ sessionId, onClose }: VideoConferenceTestProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [callDuration] = useState(125); // 2:05

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Session link copied to clipboard');
    });
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Enhanced Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span className="font-medium">Planning Poker Video Call (TEST)</span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>(1 participants)</span>
            
            {/* Call Duration */}
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(callDuration)}</span>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Connected</span>
            </div>

            {/* Connection Quality */}
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Excellent</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Copy Link Button */}
          <button
            onClick={copySessionLink}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy session link"
          >
            <Copy className="h-4 w-4" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>

      {/* Enhanced Video Grid */}
      <div className="flex-1 p-4 relative">
        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-4 right-4 bg-gray-800 rounded-lg p-4 shadow-lg z-10 min-w-64">
            <h3 className="text-lg font-semibold mb-4">Video Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Video Quality</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                  <option value="auto">Auto</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Frame Rate</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
                  <option value={15}>15 FPS</option>
                  <option value={24}>24 FPS</option>
                  <option value={30}>30 FPS</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Noise Suppression</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Echo Cancellation</span>
                </label>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded transition-colors"
            >
              Close Settings
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {/* Test Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
              <Video className="h-16 w-16 text-white opacity-50" />
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              You (Test)
            </div>
            <div className="absolute top-2 left-2">
              <div className="bg-green-600 px-2 py-1 rounded text-xs">Good</div>
            </div>
          </div>

          {/* Test Remote Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-white">T</span>
                </div>
                <p className="text-sm text-gray-300">Test User</p>
                <p className="text-xs text-gray-500">Connecting...</p>
              </div>
            </div>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              Test User
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="flex justify-center items-center space-x-4">
          <button className="p-4 rounded-full transition-all duration-200 bg-gray-700 hover:bg-gray-600">
            <Video className="h-6 w-6" />
          </button>
          <button className="p-4 rounded-full transition-all duration-200 bg-gray-700 hover:bg-gray-600">
            <Video className="h-6 w-6" />
          </button>
          <button className="p-4 rounded-full transition-all duration-200 bg-gray-700 hover:bg-gray-600">
            <Video className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
