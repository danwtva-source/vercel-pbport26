import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { DataService } from '../services/firebase';
import { Bell, Pin, Calendar, ChevronRight, ExternalLink, X, Megaphone } from 'lucide-react';
import { formatRelativeTime } from '../utils';

interface AnnouncementsBannerProps {
  /** User role to filter announcements */
  role: 'admin' | 'committee' | 'applicant' | 'community';
  /** Maximum number of announcements to show */
  maxItems?: number;
  /** Compact mode for sidebars */
  compact?: boolean;
  /** Show header with title */
  showHeader?: boolean;
}

/**
 * Announcements Banner Component
 * Displays relevant announcements for the current user role
 */
export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({
  role,
  maxItems = 3,
  compact = false,
  showHeader = true
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedAnnouncements');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    loadAnnouncements();
  }, [role]);

  const loadAnnouncements = async () => {
    try {
      const data = await DataService.getAnnouncementsForRole(role);
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  // Filter out dismissed announcements and limit to maxItems
  const visibleAnnouncements = announcements
    .filter(a => !dismissedIds.includes(a.id))
    .slice(0, maxItems);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-4">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getPriorityStyle = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300';
      case 'high':
        return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
      default:
        return 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200';
    }
  };

  const getPriorityBadge = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">Important</span>;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {showHeader && (
          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm mb-2">
            <Megaphone size={16} />
            Announcements
          </div>
        )}
        {visibleAnnouncements.map(announcement => (
          <div
            key={announcement.id}
            className={`p-3 rounded-lg border ${getPriorityStyle(announcement.priority)} relative`}
          >
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition"
              title="Dismiss"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-2 pr-5">
              {announcement.pinned && <Pin size={12} className="text-purple-600 mt-1 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-800 text-sm truncate">{announcement.title}</span>
                  {getPriorityBadge(announcement.priority)}
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                {announcement.actionUrl && announcement.actionLabel && (
                  <a
                    href={announcement.actionUrl}
                    target={announcement.actionUrl.startsWith('http') ? '_blank' : undefined}
                    rel={announcement.actionUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 mt-1 font-bold"
                  >
                    {announcement.actionLabel}
                    {announcement.actionUrl.startsWith('http') ? <ExternalLink size={10} /> : <ChevronRight size={10} />}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-800 font-bold">
            <Megaphone size={20} />
            <span>Announcements</span>
            {announcements.length > maxItems && (
              <span className="text-xs text-gray-500 font-normal">
                ({announcements.length - dismissedIds.length} total)
              </span>
            )}
          </div>
        </div>
      )}

      {visibleAnnouncements.map(announcement => (
        <div
          key={announcement.id}
          className={`p-4 rounded-xl border-2 ${getPriorityStyle(announcement.priority)} relative transition-all hover:shadow-md`}
        >
          <button
            onClick={() => handleDismiss(announcement.id)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
            title="Dismiss"
          >
            <X size={16} />
          </button>

          <div className="pr-8">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {announcement.pinned && <Pin size={14} className="text-purple-600" />}
              <h4 className="font-bold text-gray-900">{announcement.title}</h4>
              {getPriorityBadge(announcement.priority)}
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                {announcement.category}
              </span>
            </div>

            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              {announcement.content}
            </p>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={12} />
                {formatRelativeTime(announcement.createdAt)}
              </span>

              {announcement.actionUrl && announcement.actionLabel && (
                <a
                  href={announcement.actionUrl}
                  target={announcement.actionUrl.startsWith('http') ? '_blank' : undefined}
                  rel={announcement.actionUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-bold"
                >
                  {announcement.actionLabel}
                  {announcement.actionUrl.startsWith('http') ? <ExternalLink size={14} /> : <ChevronRight size={14} />}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementsBanner;
