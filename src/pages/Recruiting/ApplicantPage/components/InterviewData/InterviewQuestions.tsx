import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, History, CheckCircle2, Circle, Award, Target, FileText, MessageSquare, User, BarChart3, Sparkles, ArrowLeft, Play, FileCheck, AlertCircle, XCircle, Calendar, Briefcase } from 'lucide-react';
import { useApplicant } from '../../../../../hooks/queries';
import type {
  InterviewQuestionsProps,
  InterviewData,
} from '../../../../../types/applicants';

const InterviewQuestions: React.FC<InterviewQuestionsProps> = ({ applicantId }) => {
  const [view, setView] = useState<'selection' | 'group-picking' | 'interview-picker' | 'interview'>('selection');
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [achievedPercentages, setAchievedPercentages] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftPercentages, setDraftPercentages] = useState<Record<string, number>>({});
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [interviewSource, setInterviewSource] = useState<'new' | 'existing' | null>(null);

  const { data: applicantData } = useApplicant(applicantId || '', { enabled: !!applicantId });

  type ExistingQuestion = {
    question?: string;
    score?: number;
    achievedScore?: number;
    notes?: string;
    answerType?: string;
    choices?: string[];
    _id?: string;
    id?: string;
  };
  type ExistingInterview = {
    _id?: string;
    id?: string;
    scheduledAt?: string;
    startedAt?: string;
    endedAt?: string;
    status?: string;
    type?: string;
    notes?: string;
    totalScore?: number;
    achievedScore?: number;
    questions?: ExistingQuestion[];
  };

  const applicantInterviews = (applicantData as { interviews?: ExistingInterview[] } | undefined)?.interviews;
  const hasExistingInterview =
    !!applicantData && Array.isArray(applicantInterviews) && applicantInterviews.length > 0;

  const selectedInterview = useMemo<ExistingInterview | null>(() => {
    if (!hasExistingInterview || !selectedInterviewId) return null;
    return (
      (applicantInterviews ?? []).find(
        (iv) => (iv._id || iv.id) === selectedInterviewId
      ) ?? null
    );
  }, [hasExistingInterview, selectedInterviewId, applicantInterviews]);

  const selectedInterviewGroupId = selectedInterviewId
    ? `iv_${selectedInterviewId}`
    : null;

  const flatExistingQuestions = useMemo<ExistingQuestion[]>(
    () =>
      selectedInterview && Array.isArray(selectedInterview.questions)
        ? selectedInterview.questions
        : [],
    [selectedInterview]
  );

  const loadInterview = (interview: ExistingInterview) => {
    const id = interview._id || interview.id;
    if (!id) return;
    const questions = Array.isArray(interview.questions) ? interview.questions : [];
    const initialPercentages: Record<string, number> = {};
    const initialAnswers: Record<string, unknown> = {};
    questions.forEach((q) => {
      const qId = q?.id || q?._id;
      if (!qId) return;
      const score = Number(q?.score ?? 0);
      const achieved = Number(q?.achievedScore ?? 0);
      if (score > 0) {
        initialPercentages[qId] = Math.max(0, Math.min(100, (achieved / score) * 100));
      }
      if (q?.notes) {
        initialAnswers[qId] = q.notes;
      }
    });
    const groupId = `iv_${id}`;
    setSelectedInterviewId(id);
    setInterviewSource('existing');
    setAchievedPercentages(initialPercentages);
    setAnswers(initialAnswers);
    setDraftPercentages({ ...initialPercentages });
    setDraftAnswers({ ...initialAnswers });
    setSelectedGroupIds([groupId]);
    setOpenGroups([groupId]);
    setIsEditing(false);
    setView('interview');
  };

  useEffect(() => {
    if (!hasExistingInterview) return;
    const interviews = applicantInterviews ?? [];
    if (interviews.length === 1) {
      loadInterview(interviews[0]);
    } else {
      setView('interview-picker');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExistingInterview, applicantData]);

  const data: InterviewData = useMemo(() => {
    if (selectedInterview && selectedInterviewGroupId && flatExistingQuestions.length > 0) {
      const total = Number(selectedInterview.totalScore ?? 0);
      const achieved = Number(selectedInterview.achievedScore ?? 0);
      const dateLabel = selectedInterview.scheduledAt
        ? new Date(selectedInterview.scheduledAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Interview';
      const performance = total > 0 ? Math.round((achieved / total) * 100) : 0;
      return {
        groups: [
          {
            name: `${dateLabel} • ${performance}%`,
            icon: Calendar,
            color: 'blue',
            _id: selectedInterviewGroupId,
            questions: flatExistingQuestions.map((q: ExistingQuestion, idx: number) => ({
              question: q?.question || '',
              score: Number(q?.score ?? 0),
              answerType: q?.answerType || 'text',
              choices: Array.isArray(q?.choices) ? q.choices : [],
              _id: q?._id || `existing_q_${idx}`,
              id: q?.id || q?._id || `existing_q_${idx}`,
              description: q?.notes || '',
              achievedScore: Number(q?.achievedScore ?? 0),
            })),
          },
        ],
      };
    }

    return {
      "groups": [
        {
          "name": "Personal Presentation",
          "icon": User,
          "color": "purple",
          "questions": [
            {
              "question": "Formal Attire & Appearance",
              "score": 20,
              "answerType": "checkbox",
              "choices": ["Yes", "No", "Partially"],
              "_id": "69f7724085e00883dfe826cb",
              "id": "69f7724085e00883dfe826cb",
              "description": "Candidate's professional appearance and adherence to dress code"
            },
            {
              "question": "Communication Tone",
              "score": 20,
              "answerType": "checkbox",
              "choices": ["Professional", "Casual", "Aggressive", "Passive"],
              "_id": "69f7724085e00883dfe826cc",
              "id": "69f7724085e00883dfe826cc",
              "description": "How the candidate communicates during the interview"
            },
            {
              "question": "How did you hear about us & what do you know about us?",
              "score": 0,
              "answerType": "text",
              "choices": [],
              "_id": "69f7724085e00883dfe826cd",
              "id": "69f7724085e00883dfe826cd",
              "description": "Candidate's knowledge about the company and recruitment source"
            },
            {
              "question": "Punctuality",
              "score": 20,
              "answerType": "checkbox",
              "choices": ["In time", "Early", "Late"],
              "_id": "69f7724085e00883dfe826ce",
              "id": "69f7724085e00883dfe826ce",
              "description": "Candidate's arrival time for the interview"
            },
            {
              "question": "Camera & Lighting Quality",
              "score": 20,
              "answerType": "text",
              "choices": [],
              "_id": "69f7724085e00883dfe826cf",
              "id": "69f7724085e00883dfe826cf",
              "description": "Technical setup and presentation quality"
            },
            {
              "question": "Education Status",
              "score": 10,
              "answerType": "checkbox",
              "choices": ["Student", "Graduated", "Post-grad"],
              "_id": "69f7724085e00883dfe826d0",
              "id": "69f7724085e00883dfe826d0",
              "description": "Current educational level and status"
            }
          ],
          "_id": "69f7724085e00883dfe826ca"
        },
        {
          "name": "Professional Appeal",
          "icon": Award,
          "color": "blue",
          "questions": [
            {
              "question": "Overall Presentation & Appearance",
              "score": 50,
              "answerType": "text",
              "choices": [],
              "_id": "69f7724085e00883dfe826d2",
              "id": "69f7724085e00883dfe826d2",
              "description": "General professional appearance and demeanor"
            },
            {
              "question": "Language Proficiency",
              "score": 0,
              "answerType": "checkbox",
              "choices": ["Arabic", "English", "French"],
              "_id": "69f7724085e00883dfe826d3",
              "id": "69f7724085e00883dfe826d3",
              "description": "Languages spoken by the candidate"
            },
            {
              "question": "Educational Background",
              "score": 0,
              "answerType": "text",
              "choices": [],
              "_id": "69f7724085e00883dfe826d4",
              "id": "69f7724085e00883dfe826d4",
              "description": "Candidate's academic qualifications and institution"
            }
          ],
          "_id": "69f7724085e00883dfe826d1"
        }
      ]
    };
  }, [selectedInterview, selectedInterviewGroupId, flatExistingQuestions]);

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const startInterviewWithGroups = () => {
    if (selectedGroupIds.length > 0) {
      setInterviewSource('new');
      setSelectedInterviewId(null);
      setIsEditing(true);
      setDraftPercentages({ ...achievedPercentages });
      setDraftAnswers({ ...answers });
      setView('interview');
    }
  };

  const beginEdit = () => {
    setDraftPercentages({ ...achievedPercentages });
    setDraftAnswers({ ...answers });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftPercentages({ ...achievedPercentages });
    setDraftAnswers({ ...answers });
    setIsEditing(false);
  };

  const saveEdit = () => {
    setAchievedPercentages({ ...draftPercentages });
    setAnswers({ ...draftAnswers });
    setIsEditing(false);
  };

  const handleAnswerChange = (questionId: string, value: unknown) => {
    if (!isEditing) return;
    setDraftAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handlePercentageChange = (questionId: string, percentage: number) => {
    if (!isEditing) return;
    setDraftPercentages(prev => ({
      ...prev,
      [questionId]: percentage
    }));
  };

  const totals = useMemo(() => {
    let totalScore = 0;
    let totalAchieved = 0;
    let answeredCount = 0;
    let totalQuestions = 0;

    const percentages = isEditing ? draftPercentages : achievedPercentages;
    const answerMap = isEditing ? draftAnswers : answers;

    data.groups
      .filter(g => selectedGroupIds.includes(g._id))
      .forEach(group => {
        group.questions.forEach(q => {
          totalScore += q.score;
          totalQuestions++;
          const percentage = percentages[q.id] || 0;
          totalAchieved += (q.score * percentage) / 100;
          if (answerMap[q.id]) answeredCount++;
        });
      });

    const completionPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const overallPerformance = totalScore > 0 ? (totalAchieved / totalScore) * 100 : 0;

    return { totalScore, totalAchieved, completionPercentage, overallPerformance, answeredCount, totalQuestions };
  }, [data, isEditing, draftPercentages, achievedPercentages, selectedGroupIds, draftAnswers, answers]);

  const getColorClasses = (color: string) => {
    const colors = {
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        hover: 'hover:bg-purple-50',
        icon: 'text-purple-500',
        light: 'bg-purple-100'
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        hover: 'hover:bg-blue-50',
        icon: 'text-blue-500',
        light: 'bg-blue-100'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (view === 'selection') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-12 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-xl">
        <div className="text-center max-w-md">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
              <MessageSquare className="h-12 w-12 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Interview Session</h3>
          <p className="text-gray-500 mb-8">Prepare or resume the interview process for this candidate</p>
          <div className="flex gap-3 justify-center items-center">
  <button
    onClick={() => {
      setSelectedGroupIds([]);
      setAchievedPercentages({});
      setAnswers({});
      setDraftPercentages({});
      setDraftAnswers({});
      setIsEditing(false);
      setSelectedInterviewId(null);
      setInterviewSource(null);
      setOpenGroups([]);
      setView('group-picking');
    }}
    className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
  >
    <Sparkles className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
    Create New Interview
  </button>
  <button
    onClick={() => {
      if (!hasExistingInterview) return;
      const interviews = applicantInterviews ?? [];
      if (interviews.length === 1) {
        loadInterview(interviews[0]);
      } else {
        setView('interview-picker');
      }
    }}
    disabled={!hasExistingInterview}
    className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <History className="h-3.5 w-3.5 group-hover:text-blue-600 transition-colors" />
    Use Existing Interview
  </button>
</div>
        </div>
      </div>
    );
  }

  if (view === 'group-picking') {
    const selectedCount = selectedGroupIds.length;
    const totalGroups = data.groups.length;

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8">
          <h3 className="text-2xl font-bold text-white mb-2">Select Interview Modules</h3>
          <p className="text-gray-300">Choose which assessment areas to include in this session</p>
          <div className="mt-4 flex gap-2">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white">
              {selectedCount} of {totalGroups} selected
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {data.groups.map(group => {
              const colors = getColorClasses(group.color);
              const GroupIcon = group.icon;
              const isSelected = selectedGroupIds.includes(group._id);
              
              return (
                <div 
                  key={group._id}
                  onClick={() => toggleGroupSelection(group._id)}
                  className={`group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? `${colors.bg} ${colors.border} shadow-lg transform scale-[1.02]` 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.light} ${colors.text}`}>
                        <GroupIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${isSelected ? colors.text : 'text-gray-800'}`}>
                          {group.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{group.questions.length} questions</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            Total: {group.questions.reduce((sum, q) => sum + q.score, 0)} pts
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className={`h-6 w-6 ${colors.text}`} />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-300 group-hover:text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button 
              onClick={() => setView('selection')}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={startInterviewWithGroups}
              disabled={selectedGroupIds.length === 0}
              className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'interview-picker') {
    const interviews = applicantInterviews ?? [];
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold text-white">Existing Interviews</h3>
            <button
              onClick={() => setView('selection')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
          <p className="text-gray-300">
            {interviews.length} interview{interviews.length === 1 ? '' : 's'} found for this candidate. Select one to review its questions.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interviews.map((interview, idx) => {
              const id = interview._id || interview.id || `iv_${idx}`;
              const total = Number(interview.totalScore ?? 0);
              const achieved = Number(interview.achievedScore ?? 0);
              const performance = total > 0 ? Math.round((achieved / total) * 100) : 0;
              const dateLabel = interview.scheduledAt
                ? new Date(interview.scheduledAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Unknown date';
              const status = interview.status || 'unknown';
              const statusClasses =
                status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : status === 'in_progress'
                  ? 'bg-amber-100 text-amber-700'
                  : status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700';
              const questionCount = Array.isArray(interview.questions) ? interview.questions.length : 0;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => loadInterview(interview)}
                  className="text-left p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          Interview #{interviews.length - idx}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateLabel}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusClasses}`}>
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500">Type</p>
                      <p className="text-xs font-bold text-gray-800 capitalize">{interview.type || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500">Questions</p>
                      <p className="text-xs font-bold text-gray-800">{questionCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-gray-500">Score</p>
                      <p className="text-xs font-bold text-blue-600">{achieved}/{total}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mr-3">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${performance}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600">
                      {performance}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <button
              onClick={() => {
                setIsEditing(false);
                setDraftPercentages({});
                setDraftAnswers({});
                if (interviewSource === 'existing') {
                  const interviews = applicantInterviews ?? [];
                  if (interviews.length > 1) {
                    setSelectedInterviewId(null);
                    setView('interview-picker');
                  } else {
                    setView('selection');
                  }
                } else {
                  setView('group-picking');
                }
              }}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm font-medium group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              {interviewSource === 'existing' ? 'Back to interviews' : 'Back to modules'}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                <FileCheck className="h-3.5 w-3.5 text-white" />
                <span className="text-xs text-white font-medium">
                  {totals.answeredCount}/{totals.totalQuestions} answered
                </span>
              </div>
              {isEditing ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={beginEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-xl font-bold">Interview Assessment</h3>
              <p className="text-white/80 text-sm mt-1">Candidate performance evaluation</p>
            </div>
            <div className="text-right">
              <div className="text-white text-2xl font-bold">{totals.totalAchieved.toFixed(1)}</div>
              <div className="text-white/80 text-xs">out of {totals.totalScore}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-px bg-gray-100">
          <div className="bg-white p-4 text-center">
            <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500 font-medium">Total Score</p>
            <p className="text-lg font-bold text-gray-900">{totals.totalScore}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <Award className="h-4 w-4 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500 font-medium">Achieved</p>
            <p className="text-lg font-bold text-green-600">{totals.totalAchieved.toFixed(1)}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <BarChart3 className="h-4 w-4 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500 font-medium">Performance</p>
            <p className="text-lg font-bold text-purple-600">{totals.overallPerformance.toFixed(1)}%</p>
          </div>
          <div className="bg-white p-4 text-center">
            <FileText className="h-4 w-4 text-orange-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500 font-medium">Completion</p>
            <p className="text-lg font-bold text-orange-600">{totals.completionPercentage.toFixed(0)}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-5">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${totals.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

        {/* Questions Sections */}
      <div className="space-y-4">
        {data.groups
          .filter(g => selectedGroupIds.includes(g._id))
          .map((group) => {
            const isOpen = openGroups.includes(group._id);
            const colors = getColorClasses(group.color);
            const GroupIcon = group.icon;
            const groupTotalScore = group.questions.reduce((sum, q) => sum + q.score, 0);
            const percentagesForGroup = isEditing ? draftPercentages : achievedPercentages;
            const groupAchieved = group.questions.reduce((sum, q) => {
              const percentage = percentagesForGroup[q.id] || 0;
              return sum + (q.score * percentage) / 100;
            }, 0);

            return (
              <div key={group._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-200">
                <button
                  onClick={() => toggleGroup(group._id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colors.light} ${colors.text}`}>
                      <GroupIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`text-base font-bold ${colors.text}`}>{group.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{group.questions.length} questions</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">{groupTotalScore} total pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{groupAchieved.toFixed(1)}</p>
                      <p className="text-[10px] text-gray-400">achieved</p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 bg-gradient-to-b from-gray-50/50 to-white pt-2">
                    {group.questions.map((q, index) => {
                      const activePercentages = isEditing ? draftPercentages : achievedPercentages;
                      const activeAnswers = isEditing ? draftAnswers : answers;
                      const percentage = activePercentages[q.id] || 0;
                      const currentAchieved = (q.score * percentage) / 100;
                      const answerValue = activeAnswers[q.id];
                      const isHovered = hoveredQuestion === q.id;
                      void isHovered; // to avoid unused variable warning

                      return (
                        <div
                          key={q.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                          onMouseEnter={() => setHoveredQuestion(q.id)}
                          onMouseLeave={() => setHoveredQuestion(null)}
                        >
                          <div className="p-5">
                            <div className="flex justify-between items-start gap-4 mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    q.answerType === 'checkbox'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {q.answerType === 'checkbox' ? 'Multiple Choice' : 'Open Ended'}
                                  </span>
                                  {q.score > 0 && (
                                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                      {q.score} pts
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                                {q.description && (
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {q.description}
                                  </p>
                                )}
                              </div>
                              {q.score > 0 && (
                                <div className="text-right min-w-[80px]">
                                  <div className="flex items-baseline gap-1">
                                    <p className="text-xl font-bold text-blue-600">{currentAchieved.toFixed(1)}</p>
                                    <p className="text-xs text-gray-400">/ {q.score}</p>
                                  </div>
                                  <p className="text-[10px] text-gray-400">achieved</p>
                                </div>
                              )}
                            </div>

                            {/* Answer Inputs */}
                            <div className="space-y-4">
                              {q.choices && q.choices.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {q.choices.map(choice => (
                                    <button
                                      key={choice}
                                      type="button"
                                      onClick={() => handleAnswerChange(q.id, choice)}
                                      disabled={!isEditing}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        answerValue === choice
                                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                          : 'bg-gray-100 text-gray-600'
                                      } ${isEditing ? 'hover:bg-gray-200 cursor-pointer' : 'cursor-not-allowed opacity-90'}`}
                                    >
                                      {choice}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                q.answerType === 'text' && (
                                  <div className="relative">
                                    {isEditing ? (
                                      <>
                                        <textarea
                                          value={String(answerValue ?? '')}
                                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                          placeholder="Enter candidate's answer..."
                                          className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-none"
                                          rows={3}
                                        />
                                        <div className="absolute right-3 bottom-3 text-[10px] text-gray-400">
                                          {String(answerValue ?? '').length} characters
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full text-sm p-3 border border-gray-100 bg-gray-50 rounded-xl text-gray-700 whitespace-pre-wrap min-h-[76px]">
                                        {String(answerValue ?? '').trim() || <span className="text-gray-400 italic">No answer recorded</span>}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>

                            {q.score > 0 && (
                              <div className="space-y-3 pt-4 mt-2 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 font-medium">Performance weight</span>
                                    <span className="text-xs font-bold text-blue-600">{percentage}%</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400">
                                    {percentage === 0 ? 'Not evaluated' : percentage === 100 ? 'Full score' : `${currentAchieved.toFixed(1)} points`}
                                  </span>
                                </div>
                                {isEditing ? (
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={percentage}
                                    onChange={(e) => handlePercentageChange(q.id, parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    style={{
                                      background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${percentage}%, rgb(229, 231, 235) ${percentage}%, rgb(229, 231, 235) 100%)`
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                )}
                                {isEditing && (
                                  <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>0%</span>
                                    <span>25%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>100%</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default InterviewQuestions;