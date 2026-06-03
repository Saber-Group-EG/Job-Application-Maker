import React from 'react';
import { 
  MessageSquare, 
  User, 
  CheckCircle, 
  Clock, 
  FileText, 
  Briefcase,
  Mail,
  Bell,
  Star
} from 'lucide-react';
import type { Activity, ActivityFeedProps } from '../../../../types/applicants';

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const defaultActivities: Activity[] = [
    {
      id: '1',
      type: 'comment',
      title: 'New comment added',
      timestamp: new Date().toISOString(),
      user: {
        name: 'Sarah Johnson',
      },
      comment: 'The candidate has excellent experience in React and TypeScript. Moving to technical interview phase.',
    },
    {
      id: '2',
      type: 'status_change',
      title: 'Application status changed',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      user: {
        name: 'Michael Chen',
      },
      status: 'Under Review → Technical Interview',
    },
    {
      id: '3',
      type: 'task',
      title: 'New task assigned',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      user: {
        name: 'Emma Watson',
      },
      description: 'Review portfolio and GitHub repositories',
    },
    {
      id: '4',
      type: 'document',
      title: 'Document uploaded',
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      user: {
        name: 'Max Smith',
      },
      description: 'Resume_2024.pdf',
    },
    {
      id: '5',
      type: 'email',
      title: 'Email sent to candidate',
      timestamp: new Date(Date.now() - 345600000).toISOString(),
      user: {
        name: 'David Miller',
      },
      description: 'Interview invitation for Senior Frontend Developer position',
    },
  ];

  const data = activities || defaultActivities;

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
        {data.map((activity) => (
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
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{activity.description}</span>
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
    </div>
  );
};

export default ActivityFeed;