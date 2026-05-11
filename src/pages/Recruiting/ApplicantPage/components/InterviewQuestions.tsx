import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, PlusCircle, History } from 'lucide-react';

interface Question {
  question: string;
  score: number;
  answerType: 'checkbox' | 'text';
  choices: string[];
  _id: string;
  id: string;
}

interface QuestionGroup {
  name: string;
  questions: Question[];
  _id: string;
}

const InterviewQuestions: React.FC = () => {
  const [view, setView] = useState<'selection' | 'group-picking' | 'interview'>('selection');
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [achievedPercentages, setAchievedPercentages] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const data = useMemo(() => ({
    "groups": [
      {
        "name": "personal",
        "questions": [
          {
            "question": "formal",
            "score": 20,
            "answerType": "checkbox",
            "choices": ["Yes", "No", "Partially"],
            "_id": "69f7724085e00883dfe826cb",
            "id": "69f7724085e00883dfe826cb"
          },
          {
            "question": "tone",
            "score": 20,
            "answerType": "checkbox",
            "choices": ["Professional", "Casual", "Aggressive", "Passive"],
            "_id": "69f7724085e00883dfe826cc",
            "id": "69f7724085e00883dfe826cc"
          },
          {
            "question": "عرفنا منين ويعرف عننا ايه",
            "score": 0,
            "answerType": "text",
            "choices": [],
            "_id": "69f7724085e00883dfe826cd",
            "id": "69f7724085e00883dfe826cd"
          },
          {
            "question": "جاي في معاده ؟",
            "score": 20,
            "answerType": "checkbox",
            "choices": ["In time", "Early", "Late"],
            "_id": "69f7724085e00883dfe826ce",
            "id": "69f7724085e00883dfe826ce"
          },
          {
            "question": "مناسب معاه الظهور ؟",
            "score": 20,
            "answerType": "text",
            "choices": [],
            "_id": "69f7724085e00883dfe826cf",
            "id": "69f7724085e00883dfe826cf"
          },
          {
            "question": "بتدرس ولا خلصت",
            "score": 10,
            "answerType": "checkbox",
            "choices": ["Student", "Graduated", "Post-grad"],
            "_id": "69f7724085e00883dfe826d0",
            "id": "69f7724085e00883dfe826d0"
          }
        ],
        "_id": "69f7724085e00883dfe826ca"
      },
      {
        "name": "Apeal",
        "questions": [
          {
            "question": "look",
            "score": 50,
            "answerType": "text",
            "choices": [],
            "_id": "69f7724085e00883dfe826d2",
            "id": "69f7724085e00883dfe826d2"
          },
          {
            "question": "langluage",
            "score": 0,
            "answerType": "text",
            "choices": ["Arabic", "English", "French"],
            "_id": "69f7724085e00883dfe826d3",
            "id": "69f7724085e00883dfe826d3"
          },
          {
            "question": "college",
            "score": 0,
            "answerType": "text",
            "choices": [],
            "_id": "69f7724085e00883dfe826d4",
            "id": "69f7724085e00883dfe826d4"
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

    data.groups
      .filter(g => selectedGroupIds.includes(g._id))
      .forEach(group => {
        group.questions.forEach(q => {
          totalScore += q.score;
          const percentage = achievedPercentages[q.id] || 0;
          totalAchieved += (q.score * percentage) / 100;
        });
      });

    return { totalScore, totalAchieved };
  }, [data, achievedPercentages, selectedGroupIds]);

  if (view === 'selection') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-dashed border-gray-300 gap-6">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">Interview Setup</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">Prepare or resume the interview process for this candidate</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('group-picking')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Interview
          </button>
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <History className="h-4 w-4" />
            Use Existing Interview
          </button>
        </div>
      </div>
    );
  }

  if (view === 'group-picking') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Select Interview Groups</h3>
          <p className="text-sm text-gray-500">Choose which sets of questions to include in this session</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.groups.map(group => (
            <div 
              key={group._id}
              onClick={() => toggleGroupSelection(group._id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedGroupIds.includes(group._id) 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-800 uppercase text-xs">{group.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{group.questions.length} Questions</p>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                  selectedGroupIds.includes(group._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                }`}>
                  {selectedGroupIds.includes(group._id) && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button 
            onClick={() => setView('selection')}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button 
            onClick={startInterviewWithGroups}
            disabled={selectedGroupIds.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('group-picking')} className="text-sm text-blue-600 font-medium hover:underline">
          ← Back to selection
        </button>
      </div>
      {/* Summary Header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Weight Score</p>
          <p className="text-2xl font-bold text-gray-900">{totals.totalScore}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
          <p className="text-xs text-blue-600 uppercase font-bold mb-1">Final Achieved Score</p>
          <p className="text-2xl font-bold text-blue-700">{totals.totalAchieved.toFixed(1)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {data.groups
            .filter(g => selectedGroupIds.includes(g._id))
            .map((group) => {
              const isOpen = openGroups.includes(group._id);
              return (
                <div key={group._id} className="flex flex-col">
                  <button 
                    onClick={() => toggleGroup(group._id)}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{group.name}</h4>
                      <span className="text-xs text-gray-400">{group.questions.length} Questions</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4 bg-gray-50/50 pt-2">
                      {group.questions.map((q) => {
                        const percentage = achievedPercentages[q.id] || 0;
                        const currentAchieved = (q.score * percentage) / 100;
                        
                        return (
                          <div key={q.id} className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{q.question}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${q.answerType === 'checkbox' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {q.answerType}
                                  </span>
                                  <span className="text-[10px] text-gray-400">Total Score: {q.score}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-blue-600">{currentAchieved.toFixed(1)}</p>
                                <p className="text-[10px] text-gray-400">Achieved</p>
                              </div>
                            </div>

                            {/* Answer Inputs */}
                            <div className="space-y-3">
                              {q.choices && q.choices.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {q.choices.map(choice => (
                                    <button
                                      key={choice}
                                      onClick={() => handleAnswerChange(q.id, choice)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        answers[q.id] === choice
                                          ? 'bg-blue-600 text-white shadow-sm'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {choice}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                q.answerType === 'text' && (
                                  <textarea
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    placeholder="Enter candidate's answer..."
                                    className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                    rows={2}
                                  />
                                )
                              )}
                            </div>

                            {q.score > 0 && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                                  <span>Performance Weight</span>
                                  <span>{percentage}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={percentage}
                                  onChange={(e) => handlePercentageChange(q.id, parseInt(e.target.value))}
                                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                              </div>
                            )}
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
    </div>
  );
};

export default InterviewQuestions;