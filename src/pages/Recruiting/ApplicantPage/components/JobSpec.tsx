import React from 'react';
import { Layers } from 'lucide-react';

const COLORS = [
  { bg: 'bg-[#FFF9E5]', text: 'text-[#FBBF24]' }, // Yellow
  { bg: 'bg-[#EEFAF2]', text: 'text-[#22C55E]' }, // Green
  { bg: 'bg-[#FFF0F1]', text: 'text-[#F43F5E]' }, // Pink
  { bg: 'bg-[#F5F3FF]', text: 'text-[#7C3AED]' }, // Purple
];

const JobSpec: React.FC = () => {
  const specs = [
    {
      jobSpecId: "6a00eb698d136d63562aebc3",
      answer: true,
      _id: "6a02085077d59248e46d6c3b",
      id: "6a02085077d59248e46d6c3b",
      spec: {
        en: "From tanta"
      },
      weight: 30
    },
    {
      jobSpecId: "6a00eb698d136d63562aebc4",
      answer: true,
      _id: "6a02085077d59248e46d6c3c",
      id: "6a02085077d59248e46d6c3c",
      spec: {
        en: "Own laptop"
      },
      weight: 30
    },
    {
      jobSpecId: "6a00eb698d136d63562aebc5",
      answer: true,
      _id: "6a02085077d59248e46d6c3d",
      id: "6a02085077d59248e46d6c3d",
      spec: {
        en: "Full-time availability (not currently a student)"
      },
      weight: 20
    },
    {
      jobSpecId: "6a00eb698d136d63562aebc6",
      answer: true,
      _id: "6a02085077d59248e46d6c3e",
      id: "6a02085077d59248e46d6c3e",
      spec: {
        en: "1–2 years of experience in graphic design"
      },
      weight: 20
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      {specs.map((item, index) => {
        const color = COLORS[index % COLORS.length];
        return (
          <div 
            key={item.id} 
            className={`flex items-center justify-between p-4 rounded-xl ${color.bg} transition-shadow hover:shadow-sm`}
          >
            <div className="flex items-center gap-4">
              <div className={`${color.text}`}>
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-800">{item.spec.en}</h4>
                <p className="text-sm text-gray-400">Weight: {item.weight}%</p>
              </div>
            </div>
            
            <div className={`text-sm font-bold ${color.text}`}>
              {item.answer ? '+' : '-'}{item.weight}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobSpec;

