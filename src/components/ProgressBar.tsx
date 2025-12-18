import { calculateProgress } from '../lib/scoreCalculator';
import { Reponse } from '../types';

interface ProgressBarProps {
  reponses: Reponse[];
}

export function ProgressBar({ reponses }: ProgressBarProps) {
  const progress = calculateProgress(reponses);
  const answeredCount = reponses.filter(
    (r) => r.noteCollaborateur >= 1 && r.noteCollaborateur <= 5
  ).length;
  const totalCount = reponses.length;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Progression : {answeredCount}/{totalCount} questions
        </span>
        <span className="text-sm font-medium text-gray-700">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-primary-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

