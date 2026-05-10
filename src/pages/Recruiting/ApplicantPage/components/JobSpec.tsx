import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface JobSpecItem {
  id: string;
  title: string;
  percentage: number;
  trend: 'up' | 'down';
  dueDate: string;
  met: boolean;
}

const JobSpec: React.FC = () => {
  const [specs, setSpecs] = useState<JobSpecItem[]>([
    {
      id: '1',
      title: 'Group lunch celebration',
      percentage: 28,
      trend: 'up',
      dueDate: 'Due in 2 Days',
      met: true,
    },
    {
      id: '2',
      title: 'Navigation optimization',
      percentage: 50,
      trend: 'up',
      dueDate: 'Due in 2 Days',
      met: true,
    },
    {
      id: '3',
      title: 'Rebrand strategy planning',
      percentage: 27,
      trend: 'down',
      dueDate: 'Due in 5 Days',
      met: false,
    },
    {
      id: '4',
      title: 'Product goals strategy',
      percentage: 8,
      trend: 'up',
      dueDate: 'Due in 7 Days',
      met: false,
    },
  ]);

  const toggleMet = (id: string) => {
    setSpecs(specs.map(spec => 
      spec.id === id 
        ? { ...spec, met: !spec.met }
        : spec
    ));
  };

  const getMetIcon = (met: boolean) => {
    return met ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getMetText = (met: boolean) => {
    return met ? 'Met' : 'Not Met';
  };

  const getMetColor = (met: boolean) => {
    return met 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Job Specifications</h3>
        <p className="text-xs text-gray-400 mt-0.5">Weighted requirements and progress tracking</p>
      </div>

      <div className="divide-y divide-gray-100">
        {specs.map((spec) => (
          <div key={spec.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleMet(spec.id)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-800">{spec.title}</h4>
                {spec.trend === 'up' ? (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{spec.percentage}%
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-red-600">
                    <TrendingDown className="h-3 w-3" />
                    -{spec.percentage}%
                  </span>
                )}
              </div>
              
              {/* Met/Not Met Status */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${getMetColor(spec.met)}`}>
                {getMetIcon(spec.met)}
                {getMetText(spec.met)}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  spec.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${spec.percentage}%` }}
              />
            </div>
            
            {/* Due Date */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">{spec.dueDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobSpec;