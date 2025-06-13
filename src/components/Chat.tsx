import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChatProps {
  sessionId: string;
  currentUser: { id: string; name: string; role: string };
  channel: any; // Supabase channel
  currentItemId?: string;
  isVisible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function Chat({ 
  sessionId, 
  currentUser, 
  channel, 
  currentItemId, 
  isVisible,
  onClose,
  onUnreadCountChange 
}: ChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);  // Setup chat message listener
  useEffect(() => {
    if (channel) {
      const handleChatMessage = (payload: any) => {
        const { message: chatMessage } = payload.payload;
        if (chatMessage.userId !== user?.id) {
          setMessages(prev => [...prev, chatMessage]);
          if (isMinimized) {
            setUnreadCount(prev => prev + 1);
          }
        }
      };

      channel.on('broadcast', { event: 'chat-message' }, handleChatMessage);

      // Since we're sharing the channel with the parent component,
      // we don't need to clean up the listener as it will be handled
      // when the parent component unmounts
    }
  }, [channel, user?.id, isMinimized]);

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel || !user) return;

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      userId: user.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message: newMessage.trim(),
      timestamp: new Date(),
      itemId: currentItemId
    };

    // Add to local messages immediately
    setMessages(prev => [...prev, chatMessage]);
    setNewMessage('');

    // Broadcast to other users
    await channel.send({
      type: 'broadcast',
      event: 'chat-message',
      payload: { message: chatMessage }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setUnreadCount(0);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-96 h-96' : 'w-80 h-80'
    } ${isMinimized ? 'h-12' : ''}`}>
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">Session Chat</span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleExpand}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>            <button
              onClick={toggleMinimize}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={isMinimized ? 'Maximize Chat' : 'Minimize Chat'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation about the current item</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col space-y-1 ${
                      message.userId === user?.id ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] p-2 rounded-lg text-sm ${
                        message.userId === user?.id
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <div className="font-medium text-xs opacity-75 mb-1">
                        {message.userName}
                        {message.userRole === 'Moderator' && (
                          <span className="ml-1 px-1 py-0.5 bg-white bg-opacity-20 rounded text-xs">
                            MOD
                          </span>
                        )}
                      </div>
                      <div>{message.message}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your thoughts..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1 text-right">
                {newMessage.length}/500
              </div>
            </div>
          </>
        )}      </div>
    </div>
  );
}
