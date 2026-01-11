import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Eye, ChevronDown, ChevronUp, Pin, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, Button, Badge } from './UI';
import { Announcement } from '../types';
import { formatDateUK, formatRelativeTime } from '../utils';
import { ANNOUNCEMENT_CATEGORIES } from '../constants';

interface AnnouncementsFeedProps {
  announcements: Announcement[];
  userRole?: 'admin' | 'committee' | 'applicant' | 'public';
  maxVisible?: number;
  showFilters?: boolean;
  compact?: boolean;
}

/**
 * Announcements Feed Component (PRD 4.3.4)
 * Displays announcements/news to users based on their role and visibility settings
 */
export const AnnouncementsFeed: React.FC<AnnouncementsFeedProps> = ({
  announcements,
  userRole = 'public',
  maxVisible = 5,
  showFilters = true,
  compact = false
}) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Filter announcements based on user role and visibility
  const filteredAnnouncements = announcements
    .filter(a => {
      // Filter by visibility
      if (a.visibility === 'all') return true;
      if (a.visibility === 'admin' && userRole === 'admin') return true;
      if (a.visibility === 'committee' && (userRole === 'admin' || userRole === 'committee')) return true;
      if (a.visibility === 'applicants' && (userRole === 'admin' || userRole === 'applicant')) return true;
      return false;
    })
    .filter(a => {
      // Filter by category
      if (categoryFilter === 'All') return true;
      return a.category === categoryFilter;
    })
    .filter(a => {
      // Filter by date (only show current announcements)
      const now = Date.now();
      if (a.startDate && a.startDate > now) return false;
      if (a.endDate && a.endDate < now) return false;
      return true;
    })
    .sort((a, b) => {
      // Pinned announcements first, then by date
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const visibleAnnouncements = showAll
    ? filteredAnnouncements
    : filteredAnnouncements.slice(0, maxVisible);

  const toggleExpanded = (id: string) => {
    setExpanded(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  // Get icon based on priority/type
  const getIcon = (announcement: Announcement) => {
    switch (announcement.priority) {
      case 'urgent':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'high':
        return <AlertCircle className="text-amber-600" size={20} />;
      case 'normal':
        return <Info className="text-blue-600" size={20} />;
      default:
        return <Bell className="text-purple-600" size={20} />;
    }
  };

  // Get badge variant based on category
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'deadline':
        return 'red';
      case 'update':
        return 'blue';
      case 'event':
        return 'green';
      case 'result':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (filteredAnnouncements.length === 0) {
    return (
      <Card className="bg-gray-50">
        <div className="text-center py-6">
          <Bell className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600">No announcements at this time</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      {showFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="text-purple-600" size={24} />
            <h3 className="text-lg font-bold text-purple-900">Announcements</h3>
            {filteredAnnouncements.length > 0 && (
              <Badge variant="purple">{filteredAnnouncements.length}</Badge>
            )}
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-purple-500 outline-none"
          >
            <option value="All">All Categories</option>
            {ANNOUNCEMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {visibleAnnouncements.map(announcement => {
          const isExpanded = expanded.includes(announcement.id);

          return (
            <Card
              key={announcement.id}
              className={`transition-all ${
                announcement.pinned ? 'border-l-4 border-purple-500 bg-purple-50/50' : ''
              } ${
                announcement.priority === 'urgent' ? 'border-l-4 border-red-500 bg-red-50/50' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {announcement.pinned ? (
                    <Pin className="text-purple-600" size={20} />
                  ) : (
                    getIcon(announcement)
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{announcement.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant={getCategoryBadge(announcement.category) as any}>
                          {announcement.category}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {formatRelativeTime(announcement.createdAt)}
                        </span>
                        {announcement.readCount !== undefined && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Eye size={12} />
                            {announcement.readCount} views
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary or Full Content */}
                  {compact ? (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {announcement.content}
                    </p>
                  ) : (
                    <>
                      <p className={`text-sm text-gray-600 mt-2 ${
                        !isExpanded ? 'line-clamp-2' : ''
                      }`}>
                        {announcement.content}
                      </p>
                      {announcement.content.length > 150 && (
                        <button
                          onClick={() => toggleExpanded(announcement.id)}
                          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-2 font-medium"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              Read more
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* Call to Action */}
                  {announcement.actionUrl && announcement.actionLabel && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(announcement.actionUrl, '_blank')}
                      >
                        {announcement.actionLabel}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Show More/Less */}
      {filteredAnnouncements.length > maxVisible && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1 mx-auto"
          >
            {showAll ? (
              <>
                <ChevronUp size={18} />
                Show fewer announcements
              </>
            ) : (
              <>
                <ChevronDown size={18} />
                Show all {filteredAnnouncements.length} announcements
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsFeed;
