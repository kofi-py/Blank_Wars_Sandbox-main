/**
 * Therapy domain - Judge scene
 * SCENE = Where you are, what's happening (facts only)
 */

export interface TranscriptEntry {
  message: string;
  speaker_name: string;
  speaker_id: string;
}

function formatTranscript(transcript: TranscriptEntry[]): string {
  return transcript
    .map((entry, i) => `${i + 1}. ${entry.speaker_name}: ${entry.message}`)
    .join('\n');
}

export default function buildJudgeScene(
  patientName: string,
  transcript: TranscriptEntry[]
): string {
  return `CURRENT SCENE: THERAPY SESSION EVALUATION

You are reviewing a completed therapy session for ${patientName}.

The session has ended. You have the full transcript and must now deliver your celebrity judge evaluation to the contestant and the viewing audience.

SESSION TRANSCRIPT:
${formatTranscript(transcript)}`;
}
