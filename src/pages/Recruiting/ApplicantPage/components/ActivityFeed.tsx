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
  ChevronDown,
} from 'lucide-react';

import { Modal } from '../../../../components/ui/modal';
import type { Activity, ActivityFeedProps, Interview } from '../../../../types/applicants';
import { useStatusSettings } from '../../../../hooks/useStatusSettings';

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, mailRecords = [], interviews = [], company }) => {
  const { getStatus } = useStatusSettings(company);
  const data: Activity[] = Array.isArray(activities) ? activities : [];
  const [isExpanded, setIsExpanded] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const findMailHtml = (activityTimestamp: string): string | null => {
    if (mailRecords.length === 0) return null;
    const activityTime = new Date(activityTimestamp).getTime();
    let closest: string | null = null;
    let closestDiff = Infinity;
    for (const mail of mailRecords) {
      const diff = Math.abs(new Date(mail.createdAt).getTime() - activityTime);
      if (diff < closestDiff && diff < 3600000) {
        closestDiff = diff;
        closest = mail.html;
      }
    }
    return closest;
  };

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'status_change':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'application':
        return <Briefcase className="h-4 w-4 text-gray-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-gray-500" />;
      case 'notification':
        return <Bell className="h-4 w-4 text-gray-500" />;
      case 'message':
        return <Mail className="h-4 w-4 text-gray-500" />;
      case 'interview':
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const absDiffMs = Math.abs(diffMs);
    const diffMins = Math.floor(absDiffMs / 60000);
    const diffHours = Math.floor(absDiffMs / 3600000);
    const diffDays = Math.floor(absDiffMs / 86400000);

    if (diffMs < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const findMatchingInterview = (activityTimestamp: string): Interview | null => {
    if (interviews.length === 0) return null;
    const activityTime = new Date(activityTimestamp).getTime();
    let closest: Interview | null = null;
    let closestDiff = Infinity;
    for (const interview of interviews) {
      if (!interview.scheduledAt) continue;
      const diff = Math.abs(new Date(interview.scheduledAt).getTime() - activityTime);
      if (diff < closestDiff && diff < 86400000) {
        closestDiff = diff;
        closest = interview;
      }
    }
    return closest;
  };

  const substituteInterviewVars = (html: string, interview: Interview): string => {
    let result = html;

    const interviewType = interview.type || '';
    result = result.replace(/\{\{interviewType\}\}/gi, interviewType);

    if (interview.scheduledAt) {
      const d = new Date(interview.scheduledAt);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      result = result.replace(/\{\{InterviewDate\}\}/g, dateStr);
      result = result.replace(/\{\{interviewDate\}\}/gi, dateStr);
      result = result.replace(/\{\{interviewTime\}\}/gi, timeStr);
    }

    const address = (interview as any).address || '';
    result = result.replace(/\{\{address\}\}/gi, address);

    const location = interview.videoLink || (interview as any).location || '';
    result = result.replace(/\{\{location\}\}/gi, location);

    return result;
  };

  const decodeHtmlEntities = (html: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  };

  const cleanAndFixHtml = (html: string) => {
    if (!html) return '';
    let cleaned = decodeHtmlEntities(html);
    cleaned = cleaned.replace(/<span class="ql-ui"[^>]*>[\s\S]*?<\/span>/g, '');
    cleaned = cleaned.replace(/contenteditable="false"/g, '');
    cleaned = cleaned.replace(/<\/li><li data-list="bullet">/g, '</li><li>');
    cleaned = cleaned.replace(/<li data-list="bullet">/g, '<li style="margin-left: 1rem; margin-bottom: 0.25rem;">');
    cleaned = cleaned.replace(/<li data-list="ordered">/g, '<li style="margin-left: 1rem; margin-bottom: 0.25rem;">');
    cleaned = cleaned.replace(/<\/li><\/li>/g, '</li>');
    cleaned = cleaned.replace(/<p><ol>/g, '<ol style="margin-top: 0.5rem; margin-bottom: 0.5rem; padding-left: 1.5rem;">');
    cleaned = cleaned.replace(/<\/ol><\/p>/g, '</ol>');
    cleaned = cleaned.replace(/<\/p><p>/g, '</p><p>');
    const styledHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          ${cleaned}
        </div>
      </div>
    `;
    return styledHtml;
  };

  const findMailSubject = (activityTimestamp: string): string | null => {
    const mailHtml = findMailHtml(activityTimestamp);
    if (!mailHtml) return null;
    const match = mailHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
    return match ? match[1].trim() : null;
  };

  const getActivitySubject = (activity: Activity): string | null => {
    if (activity.subject) return activity.subject;
    return findMailSubject(activity.timestamp);
  };

  const getDisplayTitle = (activity: Activity): string => {
    if ((activity.type === 'email' || activity.type === 'message')) {
      const s = getActivitySubject(activity);
      if (s) return `${activity.title} (${s})`;
    }
    return activity.title;
  };

  const renderEmailContent = (activity: Activity): string => {
    const mailHtml = findMailHtml(activity.timestamp);
    const html = decodeHtmlEntities(mailHtml || activity.description || '');
    const interview = findMatchingInterview(activity.timestamp);
    const finalHtml = interview ? substituteInterviewVars(html, interview) : html;
    return cleanAndFixHtml(finalHtml);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-base font-semibold text-gray-800">Activity Feed</h3>
            <p className="text-sm text-gray-400 mt-0.5">Recent updates and comments</p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
        </button>
      </div>

      {isExpanded && (
      <div className="space-y-0">
  {data.length === 0 ? (
    <div className="p-8 text-center">
      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">No activity yet.</p>
      <p className="text-xs text-gray-400 mt-1">Comments, status changes, and other updates will appear here.</p>
    </div>
  ) : data.map((activity, index) => (
    <div 
      key={activity.id} 
      className={`relative p-5 hover:bg-gray-50 transition-colors ${
        index !== data.length - 1 ? 'border-l-2 border-dashed border-gray-300' : ''
      }`}
      style={{ 
        marginLeft: '28px',
        borderLeftColor: '#e5e7eb'
      }}
    >
      {/* Icon positioned absolutely */}
      <div
        className="absolute"
        style={{ left: '-15px', top: '17px' }}
        onClick={() => {
          if ((activity.type === 'email' || activity.type === 'message') && activity.description) {
            setPreviewHtml(renderEmailContent(activity));
            setShowPreview(true);
          }
        }}
        role={activity.type === 'email' || activity.type === 'message' ? 'button' : undefined}
      >
        <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-300 shadow-sm flex items-center justify-center"
          style={activity.type === 'email' || activity.type === 'message' ? { cursor: 'pointer' } : undefined}
        >
          {getIcon(activity.type)}
        </div>
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {activity.type === 'status_change' && activity.status ? (
            <>
              <span className="text-sm font-semibold text-gray-800">
                Application status changed to
              </span>
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: getStatus(activity.status).color,
                  color: getStatus(activity.status).textColor,
                }}
              >
                {activity.status}
              </span>
            </>
          ) : (
            <span
              className="text-sm font-semibold text-gray-800 capitalize"
              style={(activity.type === 'email' || activity.type === 'message') && activity.description ? { cursor: 'pointer' } : undefined}
              onClick={() => {
                if ((activity.type === 'email' || activity.type === 'message') && activity.description) {
                  setPreviewHtml(renderEmailContent(activity));
                  setShowPreview(true);
                }
              }}
            >
              {getDisplayTitle(activity)}
            </span>
          )}
          {activity.type === 'interview' && activity.scheduledAt && (
            <span className="text-xs text-gray-400 ml-1">
              {new Date(activity.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {activity.type === 'interview' && activity.interviewStatus === 'completed' && activity.endedAt && (
            <span className="text-xs text-gray-500">
              Ended {new Date(activity.endedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {activity.type === 'interview' && activity.interviewStatus === 'completed' && activity.conductedBy && (
            <span className="text-xs text-gray-500">by {activity.conductedBy}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
          {formatDate(activity.timestamp)}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-gray-600">
          {activity.type === 'comment' && `Commented at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {activity.type === 'status_change' && `Status changed at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {activity.type === 'interview' && activity.interviewStatus === 'completed' && `Interview completed at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {activity.type === 'interview' && activity.interviewStatus !== 'completed' && `Interview scheduled at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {(activity.type === 'email' || activity.type === 'message') && `Sent at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {activity.type === 'application' && `Submitted at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {activity.type === 'task' && `Task at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
          {!['comment', 'status_change', 'interview', 'email', 'message', 'application', 'task'].includes(activity.type) && `Updated at ${new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by`}
        </span>
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-gray-500" />
        </div>
        {activity.user?.name && (
          <span className="text-xs font-medium text-gray-600">
            {activity.user.name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Rest of your content remains the same */}
      {activity.type === 'comment' && activity.comment && (
        <div className="pl-3 border-l-2 border-blue-200">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {activity.comment}
          </p>
        </div>
      )}

      {activity.type === 'status_change' && activity.status && (
        <div className="space-y-2">
          {activity.status === 'rejected' && activity.reasons && activity.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activity.reasons.map((reason, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-inset ring-red-200"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {activity.type === 'task' && activity.description && (
        <div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{activity.description}</span>
          </div>
        </div>
      )}

      {activity.type === 'document' && activity.description && (
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-700 font-medium">{activity.description}</span>
          </div>
        </div>
      )}

      {!['comment', 'status_change', 'task', 'document', 'email', 'message', 'interview'].includes(activity.type) && activity.description && (
        <div>
          <p className="text-sm text-gray-600">{activity.description}</p>
        </div>
      )}
      {index !== data.length - 1 && <div className="border-t-2 border-gray-200 mx-8 my-2" />}
    </div>
  ))}
</div>
      )}

      <Modal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewHtml('');
        }}
        className="max-w-3xl p-6"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Preview</h2>
          <div
            className="border rounded p-4 bg-white dark:bg-gray-800"
            style={{ maxHeight: '75vh', overflow: 'auto' }}
          >
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowPreview(false);
                setPreviewHtml('');
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActivityFeed;
