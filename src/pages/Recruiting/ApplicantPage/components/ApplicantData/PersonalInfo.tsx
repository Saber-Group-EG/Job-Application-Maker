import React from 'react';

interface PersonalInfoProps {
  userData?: {
    name: string;
    email: string;
    accountId: string;
    billingEmail: string;
    deliveryAddress: string;
    language: string;
    latestTransaction: string;
  };
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ userData }) => {
  // Default data based on the HTML
  const defaultUserData = {
    name: 'Max Smith',
    email: 'max@kt.com',
    accountId: 'ID-45453423',
    billingEmail: 'info@keenthemes.com',
    deliveryAddress: '101 Collin Street, Melbourne 3000 VIC, Australia',
    language: 'English',
    latestTransaction: '#14534',
  };

  const data = userData || defaultUserData;

  const handleDownloadCV = () => {
    // Add your download logic here
    console.log('Downloading CV...');
    // Example: window.open('/path-to-cv.pdf', '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5">
        {/* Summary Section - Centered */}
        <div className="flex flex-col items-center text-center mb-5">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-md">
            <span className="text-white text-2xl font-bold">
              {data.name.charAt(0)}
            </span>
          </div>
          {/* Name */}
          <h2 className="text-lg font-bold text-gray-800 mb-0.5">
            {data.name}
          </h2>
          {/* Company */}
          <p className="text-xs text-gray-500">
            Company Name
          </p>
          {/* Position */}
          <p className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Position Applied For
          </p>
        </div>

        {/* Details Header */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-800">Details</span>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Status
          </span>
        </div>
        
        <div className="border-t border-gray-200 mb-5 mt-5"></div>
        
        {/* Details Content - Vertical */}
        <div className="space-y-4">
          {/* Phone */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Phone
            </div>
            <div className="text-sm text-gray-400">+1 (555) 123-4567</div>
          </div>

          {/* Email */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Email
            </div>
            <a 
              href="#" 
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {data.email}
            </a>
          </div>

          {/* Date Of Birth */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Date Of Birth
            </div>
            <div className="text-sm text-gray-400">24th March, 1989</div>
          </div>

          {/* Address */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Address
            </div>
            <div className="text-sm text-gray-400 leading-relaxed">{data.deliveryAddress}</div>
          </div>

          {/* Expected Salary - Now matches the vertical layout */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Expected Salary
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base font-bold text-green-700">$80,000 - $100,000</span>
              <span className="text-xs text-green-600">/ year</span>
            </div>
          </div>

          {/* Download CV - Now matches the vertical layout */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">
              Download CV
            </div>
            <button 
              onClick={handleDownloadCV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg 
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                />
              </svg>
              <span>Download CV</span>
            </button>
          </div>

          {/* Submitted At */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Submitted At
            </div>
            <div className="text-sm text-gray-400">24th March, 2023</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;