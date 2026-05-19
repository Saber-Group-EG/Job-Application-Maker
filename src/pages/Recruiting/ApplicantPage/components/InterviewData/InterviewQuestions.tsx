import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, History, CheckCircle2, Circle, Award, Target, FileText, MessageSquare, User, BarChart3, Sparkles, ArrowLeft, Play, FileCheck, AlertCircle } from 'lucide-react';

const InterviewQuestions: React.FC = () => {
  const [view, setView] = useState<'selection' | 'group-picking' | 'interview'>('selection');
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [achievedPercentages, setAchievedPercentages] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);

  const data = useMemo(() => ({
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
  }), []);

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const startInterviewWithGroups = () => {
    if (selectedGroupIds.length > 0) {
      setView('interview');
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handlePercentageChange = (questionId: string, percentage: number) => {
    setAchievedPercentages(prev => ({
      ...prev,
      [questionId]: percentage
    }));
  };

  const totals = useMemo(() => {
    let totalScore = 0;
    let totalAchieved = 0;
    let answeredCount = 0;
    let totalQuestions = 0;

    data.groups
      .filter(g => selectedGroupIds.includes(g._id))
      .forEach(group => {
        group.questions.forEach(q => {
          totalScore += q.score;
          totalQuestions++;
          const percentage = achievedPercentages[q.id] || 0;
          totalAchieved += (q.score * percentage) / 100;
          if (answers[q.id]) answeredCount++;
        });
      });

    const completionPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const overallPerformance = totalScore > 0 ? (totalAchieved / totalScore) * 100 : 0;

    return { totalScore, totalAchieved, completionPercentage, overallPerformance, answeredCount, totalQuestions };
  }, [data, achievedPercentages, selectedGroupIds, answers]);

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
    onClick={() => setView('group-picking')}
    className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
  >
    <Sparkles className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
    Create New Interview
  </button>
  <button 
    className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm"
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

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setView('group-picking')} 
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors text-sm font-medium group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to modules
            </button>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <FileCheck className="h-3.5 w-3.5 text-white" />
              <span className="text-xs text-white font-medium">
                {totals.answeredCount}/{totals.totalQuestions} answered
              </span>
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
            const groupAchieved = group.questions.reduce((sum, q) => {
              const percentage = achievedPercentages[q.id] || 0;
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
                      const percentage = achievedPercentages[q.id] || 0;
                      const currentAchieved = (q.score * percentage) / 100;
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
                                      onClick={() => handleAnswerChange(q.id, choice)}
                                      className={`group px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        answers[q.id] === choice
                                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
                                      }`}
                                    >
                                      {choice}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                q.answerType === 'text' && (
                                  <div className="relative">
                                    <textarea
                                      value={answers[q.id] || ''}
                                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                      placeholder="Enter candidate's answer..."
                                      className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-none"
                                      rows={3}
                                    />
                                    <div className="absolute right-3 bottom-3 text-[10px] text-gray-400">
                                      {answers[q.id]?.length || 0} characters
                                    </div>
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
                                <div className="flex justify-between text-[10px] text-gray-400">
                                  <span>0%</span>
                                  <span>25%</span>
                                  <span>50%</span>
                                  <span>75%</span>
                                  <span>100%</span>
                                </div>
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