import React, { useState } from 'react';
import PersonalInfo from './components/PersonalInfo';
import ActivityFeed from './components/ActivityFeed';
import CustomResponses from './components/CustomResponses';
import JobSpec from './components/JobSpec';
import InterviewQuestions from './components/InterviewQuestions';

const ApplicantDetails: React.FC = () => {
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'interview'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [activities, setActivities] = useState([
    {
      id: '1',
      type: 'comment' as const,
      title: 'Comment added',
      timestamp: new Date().toISOString(),
      user: { name: 'Sarah Johnson' },
      comment: 'The candidate has excellent experience in React and TypeScript. Moving to technical interview phase.',
    },
    {
      id: '2',
      type: 'status_change' as const,
      title: 'Application status changed',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      user: { name: 'Michael Chen' },
      status: 'Under Review → Technical Interview',
    },
  ]);

  const handleAddComment = () => {
    if (comment.trim()) {
      const newActivity = {
        id: Date.now().toString(),
        type: 'comment' as const,
        title: 'Comment added',
        timestamp: new Date().toISOString(),
        user: { name: 'You' },
        comment: comment.trim(),
      };
      setActivities([newActivity, ...activities]);
      setComment('');
    }
  };

  const handleDelete = () => {
    // Add your delete logic here
    console.log('Delete clicked');
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
    console.log('Edit clicked', !isEditing);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-8xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Home</span>
            <span>›</span>
            <span>eCommerce</span>
            <span>›</span>
            <span className="text-gray-800">Customers</span>
          </div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Customer Details</h1>
            
            {/* Action Buttons - Right Side */}
            <div className="flex gap-3">
              <button 
                onClick={handleEdit}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                  isEditing ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('interview')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'interview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Interview Questions
          </button>
        </div>

        {activeTab === 'details' ? (
  <>
    {/* Top Row - Personal Info and Comment Section */}
    <div className="flex flex-col lg:flex-row gap-6 mb-6">
  {/* Personal Info Card */}
  <div className="lg:w-80 flex-shrink-0 ml-20">
    <PersonalInfo />
  </div>

  {/* Right Column - Takes all remaining space */}
  <div className="flex-1 space-y-6">
    {/* Add Comment Section */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Comment</h3>
      <div className="flex gap-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
          rows={3}
        />
        <button
          onClick={handleAddComment}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap h-fit"
        >
          Add Comment
        </button>
      </div>
    </div>

    {/* Job Spec Section */}
    <JobSpec />
  </div>
</div>

    {/* Custom Responses Section - Full Width */}
    <div className="mb-6">
      <CustomResponses isEditable={isEditing} />
    </div>

    {/* Activity Feed - Full Width */}
    <div className="w-full">
      <ActivityFeed activities={activities} />
    </div>
  </>
) : (
  <div className="mb-6">
    <InterviewQuestions />
  </div>
)}
      </div>
    </div>
  );
};

export default ApplicantDetails;