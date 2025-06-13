import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Edit2, Trash2, Check, X as Cancel } from 'lucide-react';
import { ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveChatMessage, loadChatMessages, editChatMessage, deleteChatMessage } from '../utils/planningSession';

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
}: ChatProps) {  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load historical chat messages when component mounts or sessionId changes
  useEffect(() => {
    const loadHistoricalMessages = async () => {
      if (!sessionId) return;
      
      setIsLoadingHistory(true);
      try {
        const historicalMessages = await loadChatMessages(sessionId, 100);
        setMessages(historicalMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Don't show error to user, just start with empty messages
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoricalMessages();
  }, [sessionId]); // Reload when sessionId changes

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isVisible) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isVisible]);  // Setup chat message listener
  useEffect(() => {
    if (channel && user) {
      const handleChatMessage = (payload: any) => {
        const { message: chatMessage } = payload.payload;
        
        // Only add messages from other users to prevent duplicates
        if (chatMessage.userId !== user.id) {
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => msg.id === chatMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, chatMessage];
          });
          
          // Increment unread count only for messages from other users when chat is hidden
          if (!isVisible) {
            setUnreadCount(prev => prev + 1);
          }
        }
      };

      const handleChatMessageUpdate = (payload: any) => {
        const { message: updatedMessage } = payload.payload;
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
        ));
      };

      const handleChatMessageDelete = (payload: any) => {
        const { message: deletedMessage } = payload.payload;
        setMessages(prev => prev.map(msg => 
          msg.id === deletedMessage.id ? { ...msg, ...deletedMessage } : msg
        ));
      };

      // Subscribe to chat messages
      channel.on('broadcast', { event: 'chat-message' }, handleChatMessage);
      channel.on('broadcast', { event: 'chat-message-updated' }, handleChatMessageUpdate);
      channel.on('broadcast', { event: 'chat-message-deleted' }, handleChatMessageDelete);

      // Note: We don't unsubscribe here because the parent component (VotingSession)
      // manages the channel lifecycle and will call channel.unsubscribe() when needed
    }
  }, [channel, user?.id, isVisible]);

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Reset unread count when chat becomes visible
  useEffect(() => {
    if (isVisible) {
      setUnreadCount(0);
    }
  }, [isVisible]);  const sendMessage = async () => {
    if (!newMessage.trim() || !channel || !user) return;

    const messageText = newMessage.trim();
    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      userId: user.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message: messageText,
      timestamp: new Date(),
      itemId: currentItemId
    };

    // Clear input immediately for better UX
    setNewMessage('');

    // Add to local messages immediately for the sender
    setMessages(prev => [...prev, chatMessage]);

    try {
      // Save to database first
      await saveChatMessage(chatMessage);
      
      // Then broadcast to other users
      await channel.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: { message: chatMessage }
      });
    } catch (error) {
      console.error('Failed to send chat message:', error);
      // Remove the message from local state on error and restore input
      setMessages(prev => prev.filter(msg => msg.id !== chatMessage.id));
      setNewMessage(messageText);
    }
  };
  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.message);
    setErrorMessage(null); // Clear any previous errors
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
    setErrorMessage(null); // Clear any errors
  };  const saveEditMessage = async (messageId: string) => {
    if (!editingText.trim() || !user) return;
    
    setIsEditingSaving(true);
    setErrorMessage(null);

    try {
      const updatedMessage = await editChatMessage(messageId, user.id, editingText.trim());
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updatedMessage } : msg
      ));

      // Broadcast the update to other users
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'chat-message-updated',
          payload: { message: updatedMessage }
        });
      }

      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      setErrorMessage(`Failed to save your edit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEditingSaving(false);
    }
  };
  const showDeleteConfirmation = (messageId: string) => {
    setShowDeleteConfirm(messageId);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };  const confirmDelete = async () => {
    if (!showDeleteConfirm || !user) return;
    
    const messageId = showDeleteConfirm;
    setShowDeleteConfirm(null);
    setErrorMessage(null);

    try {
      const deletedMessage = await deleteChatMessage(messageId, user.id);
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...deletedMessage } : msg
      ));

      // Broadcast the deletion to other users
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'chat-message-deleted',
          payload: { message: deletedMessage }
        });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      setErrorMessage(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Chat Panel - Right Side */}
      <div className={`
        fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        w-full max-w-sm lg:max-w-md xl:max-w-lg
        flex flex-col
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Session Chat</h3>
              <p className="text-sm opacity-90">Share ideas and discuss</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {isLoadingHistory ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="font-medium">Loading chat history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          ) : (            messages.map((message) => {
              // Don't show deleted messages unless they're being edited
              if (message.isDeleted && editingMessageId !== message.id) {
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-3 shadow-sm opacity-60
                      ${message.userId === user?.id 
                        ? 'bg-gray-400 text-white' 
                        : 'bg-gray-200 text-gray-600 border border-gray-300'
                      }
                    `}>
                      <p className="text-sm italic">
                        This message has been deleted
                      </p>
                      <p className={`text-xs mt-2 opacity-75 ${
                        message.userId === user?.id ? 'text-gray-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                        {message.deletedAt && (
                          <span className="ml-2">
                            (deleted {formatTime(message.deletedAt)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              }

              const isOwnMessage = message.userId === user?.id;
              const isEditing = editingMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-3 shadow-sm relative group
                    ${isOwnMessage 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-900 border border-gray-200'
                    }
                  `}>
                    {!isOwnMessage && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {message.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-700">
                            {message.userName}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({message.userRole})
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {isEditing ? (                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEditMessage(message.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditMessage();
                            }
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          rows={2}
                          maxLength={500}
                          autoFocus
                        />
                        <div className="flex items-center gap-2">                          <button
                            onClick={() => saveEditMessage(message.id)}
                            disabled={!editingText.trim() || isEditingSaving}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Save changes (Enter)"
                          >
                            {isEditingSaving ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={cancelEditMessage}
                            className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            title="Cancel editing (Esc)"
                          >
                            <Cancel className="w-3 h-3" />
                          </button>
                          <span className="text-xs text-gray-500 ml-2">
                            {editingText.length}/500
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed break-words">
                          {message.message}
                        </p>
                        
                        {/* Edit/Delete buttons for own messages */}
                        {isOwnMessage && !message.isDeleted && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditMessage(message)}
                                className="p-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
                                title="Edit message"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>                              <button
                                onClick={() => showDeleteConfirmation(message.id)}
                                className="p-1 bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className={`text-xs mt-2 opacity-75 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                      {message.isEdited && (
                        <span className="ml-2 italic">
                          (edited{message.editedAt ? ` ${formatTime(message.editedAt)}` : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-100 border-t border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-700">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Delete Message?</p>
                <p className="text-xs text-yellow-600">This action cannot be undone.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={confirmDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <span className="text-xs text-gray-400">
                  {newMessage.length}/500
                </span>
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
