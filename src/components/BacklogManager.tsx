import React, { useState } from 'react';
import { BacklogItem } from '../types';
import { Plus, FileText, AlertCircle, CheckCircle, Upload, Trash2, Edit3, Save, X } from 'lucide-react';
import { generateSampleBacklog } from '../utils/planningPoker';

interface BacklogManagerProps {
  backlogItems: BacklogItem[];
  onBacklogUpdate: (items: BacklogItem[]) => void;
  onStartSession: () => void;
  userRole: string;
}

export default function BacklogManager({ backlogItems, onBacklogUpdate, onStartSession, userRole }: BacklogManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    acceptanceCriteria: string;
  }>({
    title: '',
    description: '',
    priority: 'Medium',
    acceptanceCriteria: ''
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: BacklogItem = {
      id: Date.now().toString(),
      title: newItem.title,
      description: newItem.description,
      priority: newItem.priority,
      acceptanceCriteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim()),
      status: 'Pending'
    };
    
    onBacklogUpdate([...backlogItems, item]);
    setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
    setShowAddForm(false);
  };

  const handleEditItem = (item: BacklogItem) => {
    setEditingItem(item.id);
    setNewItem({
      title: item.title,
      description: item.description,
      priority: item.priority,
      acceptanceCriteria: item.acceptanceCriteria?.join('\n') || ''
    });
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedItems = backlogItems.map(item => 
      item.id === editingItem 
        ? {
            ...item,
            title: newItem.title,
            description: newItem.description,
            priority: newItem.priority,
            acceptanceCriteria: newItem.acceptanceCriteria.split('\n').filter(c => c.trim())
          }
        : item
    );
    
    onBacklogUpdate(updatedItems);
    setEditingItem(null);
    setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setNewItem({ title: '', description: '', priority: 'Medium', acceptanceCriteria: '' });
  };

  const handleLoadSample = () => {
    onBacklogUpdate(generateSampleBacklog());
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this backlog item?')) {
      onBacklogUpdate(backlogItems.filter(item => item.id !== id));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Estimated': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Skipped': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default: return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStoryPointsDisplay = (item: BacklogItem) => {
    if (!item.storyPoints) return null;
    
    const isNumeric = typeof item.storyPoints === 'number';
    const bgColor = item.estimationType === 'tshirt' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {item.storyPoints}{isNumeric ? ' SP' : ''}
      </span>
    );
  };

  const pendingItems = backlogItems.filter(item => item.status === 'Pending');
  const estimatedItems = backlogItems.filter(item => item.status === 'Estimated');
  const skippedItems = backlogItems.filter(item => item.status === 'Skipped');

  const renderItemForm = (isEditing: boolean = false) => (
    <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit User Story' : 'Add New User Story'}
      </h3>
      <form onSubmit={isEditing ? handleUpdateItem : handleAddItem} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={newItem.priority}
            onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Acceptance Criteria (one per line)
          </label>
          <textarea
            value={newItem.acceptanceCriteria}
            onChange={(e) => setNewItem({ ...newItem, acceptanceCriteria: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Enter acceptance criteria, one per line"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Update Story' : 'Add Story'}
          </button>
          <button
            type="button"
            onClick={isEditing ? handleCancelEdit : () => setShowAddForm(false)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200 flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  const renderBacklogSection = (title: string, items: BacklogItem[], emptyMessage: string) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {title}
        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
          {items.length}
        </span>
      </h2>
      
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusIcon(item.status)}
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                  {getStoryPointsDisplay(item)}
                </div>
                {userRole === 'Moderator' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-blue-500 hover:text-blue-700 p-1 rounded transition-colors duration-200"
                      title="Edit item"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors duration-200"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-700 mb-3">{item.description}</p>
              {item.acceptanceCriteria && item.acceptanceCriteria.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Acceptance Criteria:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.acceptanceCriteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Product Backlog</h1>
            <p className="text-blue-100">Manage your user stories and backlog items</p>
          </div>

          <div className="p-6">
            {userRole === 'Moderator' && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Story
                </button>
                <button
                  onClick={handleLoadSample}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Load Sample Data
                </button>
                {pendingItems.length > 0 && (
                  <button
                    onClick={onStartSession}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 ml-auto"
                  >
                    Start Planning Session ({pendingItems.length} items)
                  </button>
                )}
              </div>
            )}

            {(showAddForm || editingItem) && renderItemForm(!!editingItem)}

            {/* Backlog Sections */}
            {renderBacklogSection(
              "📋 Pending Items", 
              pendingItems, 
              userRole === 'Moderator' 
                ? "No pending items. Add stories or load sample data to get started." 
                : "No pending items to estimate."
            )}

            {renderBacklogSection(
              "✅ Estimated Items", 
              estimatedItems, 
              "No items have been estimated yet."
            )}

            {renderBacklogSection(
              "⏭️ Skipped Items", 
              skippedItems, 
              "No items have been skipped."
            )}
          </div>
        </div>
      </div>
    </div>
  );
}