// Transcript + AI review of one interview (audio itself is never stored).

export type RecordingSegment = {
  index: number;
  status: 'processing' | 'done' | 'failed';
  error: string | null;
  durationSec: number;
  chars: number;
};

export type ReviewItem = {
  questionIndex: number;
  questionId: string;
  questionText: string;
  covered: boolean;
  answerSummary: string;
  suggestedScore: number | null;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
  // What applying writes onto the question; null parts are left untouched.
  proposed: { notes: string | null; achievedScore: number | null };
};

// A question found in the recording that is not on the interview's sheet. When the
// sheet is empty, these are all the questions asked in the interview.
export type ExtraQuestion = {
  question: string;
  answerSummary: string;
  suggestedScore: number;
  maxScore: number;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
};

export type InterviewReview = {
  status: 'none' | 'running' | 'ready' | 'failed';
  summary: string;
  strengths: string[];
  concerns: string[];
  items: ReviewItem[];
  extraQuestions: ExtraQuestion[];
  // Positions in extraQuestions already added to the interview.
  appliedExtra: number[];
  generatedAt: string | null;
  appliedAt: string | null;
  error: string | null;
};

export type InterviewRecording = {
  // False until the server has its transcription key.
  transcriptionConfigured: boolean;
  exists: boolean;
  consent: { given: boolean; at?: string };
  segments: RecordingSegment[];
  transcript: string;
  edited: boolean;
  processing: boolean;
  review: InterviewReview;
};

export type ApplyReviewResult = { applied: number; skipped: number; review: InterviewReview };
