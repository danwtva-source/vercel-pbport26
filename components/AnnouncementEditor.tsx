import React, { useState, useEffect } from 'react';
import { Bell, Save, X, Pin, Eye, Calendar, Trash2, Plus, Edit } from 'lucide-react';
import { Card, Button, Input, Modal, Badge } from './UI';
import { Announcement, AnnouncementVisibility, AnnouncementPriority, AnnouncementCategory } from '../types';
import { formatDateUK, formatRelativeTime } from '../utils';
import { ANNOUNCEMENT_CATEGORIES } from '../constants';

interface AnnouncementEditorProps {
  announcements: Announcement[];
  onSave: (announcement: Announcement) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const VISIBILITY_OPTIONS: { value: AnnouncementVisibility; label: string }[] = [
  { value: 'all', label: 'Everyone (Public)' },
  { value: 'applicants', label: 'Applicants Only' },
  { value: 'committee', label: 'Committee Only' },
  { value: 'admin', label: 'Admin Only' }
];

const PRIORITY_OPTIONS: { value: AnnouncementPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

/**
 * Announcement Editor Component (PRD 4.3.4)
 * Allows admins to create, edit, and manage announcements
 */
export const AnnouncementEditor: React.FC<AnnouncementEditorProps> = ({
  announcements,
  onSave,
  onDelete
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as AnnouncementCategory,
    visibility: 'all' as AnnouncementVisibility,
    priority: 'normal' as AnnouncementPriority,
    pinned: false,
    actionLabel: '',
    actionUrl: '',
    startDate: '',
    endDate: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        category: editingAnnouncement.category,
        visibility: editingAnnouncement.visibility,
        priority: editingAnnouncement.priority,
        pinned: editingAnnouncement.pinned || false,
        actionLabel: editingAnnouncement.actionLabel || '',
        actionUrl: editingAnnouncement.actionUrl || '',
        startDate: editingAnnouncement.startDate
          ? new Date(editingAnnouncement.startDate).toISOString().split('T')[0]
          : '',
        endDate: editingAnnouncement.endDate
          ? new Date(editingAnnouncement.endDate).toISOString().split('T')[0]
          : ''
      });
    } else {
      setFormData({
        title: '',
        content: '',
        category: 'general',
        visibility: 'all',
        priority: 'normal',
        pinned: false,
        actionLabel: '',
        actionUrl: '',
        startDate: '',
        endDate: ''
      });
    }
  }, [editingAnnouncement, showModal]);

  const handleOpenNew = () => {
    setEditingAnnouncement(null);
    setShowModal(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    setSaving(true);
    try {
      const announcement: Announcement = {
        id: editingAnnouncement?.id || `announcement_${Date.now()}`,
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        visibility: formData.visibility,
        priority: formData.priority,
        pinned: formData.pinned,
        actionLabel: formData.actionLabel.trim() || undefined,
        actionUrl: formData.actionUrl.trim() || undefined,
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
        createdAt: editingAnnouncement?.createdAt || Date.now(),
        updatedAt: Date.now(),
        createdBy: editingAnnouncement?.createdBy || 'admin',
        readCount: editingAnnouncement?.readCount || 0
      };

      await onSave(announcement);
      handleClose();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      alert('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    setDeleting(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('Failed to delete announcement');
    } finally {
      setDeleting(null);
    }
  };

  // Sort announcements: pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <Bell size={24} />
            Announcements Management
          </h2>
          <p className="text-gray-600">Create and manage announcements for users</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus size={18} />
          New Announcement
        </Button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {sortedAnnouncements.length === 0 ? (
          <Card className="text-center py-8">
            <Bell className="mx-auto text-gray-400 mb-3" size={40} />
            <p className="text-gray-600">No announcements yet</p>
            <Button className="mt-4" onClick={handleOpenNew}>
              <Plus size={18} />
              Create First Announcement
            </Button>
          </Card>
        ) : (
          sortedAnnouncements.map(announcement => (
            <Card
              key={announcement.id}
              className={`${announcement.pinned ? 'border-l-4 border-purple-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {announcement.pinned && (
                      <Pin className="text-purple-600" size={16} />
                    )}
                    <h4 className="font-bold text-gray-900">{announcement.title}</h4>
                    <Badge variant={
                      announcement.priority === 'urgent' ? 'red' :
                      announcement.priority === 'high' ? 'amber' : 'gray'
                    }>
                      {announcement.priority}
                    </Badge>
                    <Badge>{announcement.category}</Badge>
                    <Badge variant={
                      announcement.visibility === 'all' ? 'green' :
                      announcement.visibility === 'admin' ? 'red' : 'blue'
                    }>
                      {announcement.visibility}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatRelativeTime(announcement.createdAt)}
                    </span>
                    {announcement.readCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {announcement.readCount} views
                      </span>
                    )}
                    {announcement.startDate && (
                      <span>Starts: {formatDateUK(announcement.startDate)}</span>
                    )}
                    {announcement.endDate && (
                      <span>Ends: {formatDateUK(announcement.endDate)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(announcement)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(announcement.id)}
                    disabled={deleting === announcement.id}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          isOpen={true}
          onClose={handleClose}
          title={editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
          size="lg"
        >
          <div className="space-y-4">
            {/* Title */}
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title..."
              required
            />

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your announcement..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none resize-none"
              />
            </div>

            {/* Category and Visibility */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as AnnouncementCategory })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                >
                  {ANNOUNCEMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as AnnouncementVisibility })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                >
                  {VISIBILITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority and Pinned */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="pinned" className="font-medium text-gray-700 flex items-center gap-2">
                  <Pin size={16} />
                  Pin to top
                </label>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date (Optional)"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <Input
                label="End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            {/* Call to Action */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Call to Action (Optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Button Label"
                  value={formData.actionLabel}
                  onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                  placeholder="e.g., Learn More"
                />
                <Input
                  label="Button URL"
                  type="url"
                  value={formData.actionUrl}
                  onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={handleClose}>
                <X size={18} />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save size={18} />
                {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Publish'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AnnouncementEditor;
