import React, { useState, useEffect } from 'react';
import { PublicLayout } from '../../components/Layout';
import { Card, Badge } from '../../components/UI';
import { DataService } from '../../services/firebase';
import { Announcement } from '../../types';
import { Bell, Calendar, Pin, ExternalLink, ChevronRight, Megaphone } from 'lucide-react';
import { formatDateUK, formatRelativeTime } from '../../utils';
import { ANNOUNCEMENT_CATEGORIES } from '../../constants';

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await DataService.getPublicAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = selectedCategory === 'all'
    ? announcements
    : announcements.filter(a => a.category === selectedCategory);

  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getCategoryColor = (category: Announcement['category']) => {
    switch (category) {
      case 'deadline': return 'bg-red-50 text-red-700';
      case 'update': return 'bg-blue-50 text-blue-700';
      case 'event': return 'bg-purple-50 text-purple-700';
      case 'result': return 'bg-green-50 text-green-700';
      case 'news': return 'bg-teal-50 text-teal-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="relative -mt-8 -mx-4 mb-12 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTItMTItNS4zNzMtMTItMTJ6bTAgMjhjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMi01LjM3MyAxMi0xMiAxMi0xMi01LjM3My0xMi0xMnpNMCAxNmMwLTYuNjI3IDUuMzczLTEyIDEyLTEyczEyIDUuMzczIDEyIDEyLTUuMzczIDEyLTEyIDEyUzAgMjIuNjI3IDAgMTZ6bTAgMjhjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMi01LjM3MyAxMi0xMiAxMlMwIDUwLjYyNyAwIDQ0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 backdrop-blur-sm border border-teal-400/30 rounded-full px-4 py-2 mb-6">
              <Megaphone size={16} className="text-teal-300" />
              <span className="text-sm font-bold text-teal-100">Stay Informed</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
              Announcements
            </h1>

            <p className="text-xl text-purple-100 leading-relaxed">
              Latest updates, deadlines, and news from the Communities' Choice programme
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full font-bold text-sm transition ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {ANNOUNCEMENT_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition capitalize ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading announcements...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAnnouncements.length === 0 && (
        <Card className="text-center py-12">
          <Bell className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Announcements</h3>
          <p className="text-gray-500">
            {selectedCategory === 'all'
              ? 'There are no announcements at this time. Check back later for updates.'
              : `No ${selectedCategory} announcements at this time.`}
          </p>
        </Card>
      )}

      {/* Announcements List */}
      {!loading && filteredAnnouncements.length > 0 && (
        <div className="space-y-4">
          {filteredAnnouncements.map(announcement => (
            <Card
              key={announcement.id}
              className={`transition-all hover:shadow-lg ${
                announcement.pinned ? 'border-l-4 border-purple-500 bg-purple-50/50' : ''
              } ${
                announcement.priority === 'urgent' ? 'border-2 border-red-300' :
                announcement.priority === 'high' ? 'border-2 border-amber-300' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {announcement.pinned && (
                      <Pin className="text-purple-600" size={16} />
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge className={getPriorityColor(announcement.priority)}>
                      {announcement.priority}
                    </Badge>
                    <Badge className={getCategoryColor(announcement.category)}>
                      {announcement.category}
                    </Badge>
                    {announcement.startDate && announcement.endDate && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDateUK(announcement.startDate)} - {formatDateUK(announcement.endDate)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                    {announcement.content}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar size={14} />
                      Posted {formatRelativeTime(announcement.createdAt)}
                    </span>

                    {announcement.actionUrl && announcement.actionLabel && (
                      <a
                        href={announcement.actionUrl}
                        target={announcement.actionUrl.startsWith('http') ? '_blank' : undefined}
                        rel={announcement.actionUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                      >
                        {announcement.actionLabel}
                        {announcement.actionUrl.startsWith('http') ? (
                          <ExternalLink size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PublicLayout>
  );
};

export default AnnouncementsPage;
