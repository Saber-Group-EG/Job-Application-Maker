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
        <div className="space-y-3">
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

          {/* Expected Salary */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-0.5">
              Expected Salary
            </div>
            <div className="text-sm text-gray-400">$80,000 - $100,000</div>
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