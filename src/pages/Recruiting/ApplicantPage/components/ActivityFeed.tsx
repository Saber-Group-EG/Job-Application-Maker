import React, { useState } from 'react';
import {
  MessageSquare,
  User,
  CheckCircle,
  Clock,
  FileText,
  Briefcase,
  Mail,
  Bell,
  Star,
  X,
  Eye
} from 'lucide-react';
import type { Activity, ActivityFeedProps } from '../../../../types/applicants';

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const data: Activity[] = Array.isArray(activities) ? activities : [];
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'status_change':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'application':
        return <Briefcase className="h-4 w-4 text-indigo-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-yellow-500" />;
      case 'message':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'interview':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">Activity Feed</h3>
        <p className="text-sm text-gray-400 mt-0.5">Recent updates and comments</p>
      </div>

      <div className="divide-y divide-gray-100">
        {data.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No activity yet.</p>
            <p className="text-xs text-gray-400 mt-1">Comments, status changes, and other updates will appear here.</p>
          </div>
        ) : data.map((activity) => (
          <div key={activity.id} className="p-5 hover:bg-gray-50 transition-colors">
            {/* Header with icon, title, and timestamp */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {getIcon(activity.type)}
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {activity.title} 
                </span>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                {formatDate(activity.timestamp)}
              </span>
            </div>

            {/* User info line */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {activity.user?.name || 'System'} at {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Main content based on activity type */}
            {activity.type === 'comment' && activity.comment && (
              <div className="ml-8 pl-3 border-l-2 border-blue-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {activity.comment}
                </p>
              </div>
            )}

            {activity.type === 'status_change' && activity.status && (
              <div className="ml-8">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                  {activity.status}
                </span>
              </div>
            )}

            {activity.type === 'task' && activity.description && (
              <div className="ml-8">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{activity.description}</span>
                </div>
              </div>
            )}

            {activity.type === 'document' && activity.description && (
              <div className="ml-8">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-gray-700 font-medium">{activity.description}</span>
                </div>
              </div>
            )}

            {(activity.type === 'email' || activity.type === 'message') && activity.description && (
              <div className="ml-8">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-500 uppercase">{activity.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {activity.type === 'email' ? 'Email sent' : 'Message sent'}
                    {activity.title?.includes('message') && activity.title && ` — ${activity.title}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml(activity.description!)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                </div>
              </div>
            )}

            {/* Show description for other types that have it */}
            {!['comment', 'status_change', 'task', 'document', 'email', 'message', 'interview'].includes(activity.type) && activity.description && (
              <div className="ml-8">
                <p className="text-sm text-gray-600">{activity.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Email / Message preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-base font-semibold text-gray-800">
                Email Preview
              </h3>
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Body — renders the styled HTML */}
            <div className="flex-1 overflow-auto p-6 bg-white">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;