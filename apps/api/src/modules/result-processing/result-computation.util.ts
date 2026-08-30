import type { ResultScale, ResultScaleEntry } from "@prisma/client";

export interface SubjectScoreInput {
  subjectId: string;
  caScore: number | null;
  examScore: number | null;
}

export interface ComputedSubject {
  subjectId: string;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  letterGrade: string | null;
  gpa: number | null;
  remark: string | null;
}

/**
 * Computes the weighted total score (CA + Exam) and resolves the letter
 * grade/GPA/remark from the active grading scale.
 *
 * - When both CA and Exam are present: `total = ca * caWeight + exam * examWeight`.
 * - When only one component is present it is used as-is.
 * - The scale entry is the first whose [minScore, maxScore] contains the total.
 */
export function computeSubject(
  input: SubjectScoreInput,
  scale: (ResultScale & { entries: ResultScaleEntry[] }) | null,
  caWeight: number,
  examWeight: number,
): ComputedSubject {
  const ca = input.caScore ?? null;
  const exam = input.examScore ?? null;
  let totalScore: number | null = null;
  if (ca !== null && exam !== null) {
    totalScore = Number((ca * caWeight + exam * examWeight).toFixed(2));
  } else if (ca !== null) {
    totalScore = ca;
  } else if (exam !== null) {
    totalScore = exam;
  }

  let letterGrade: string | null = null;
  let gpa: number | null = null;
  let remark: string | null = null;
  if (totalScore !== null && scale) {
    const entry = findScaleEntry(scale, totalScore);
    if (entry) {
      letterGrade = entry.letterGrade;
      gpa = entry.gpa;
      remark = entry.remark ?? null;
    }
  }
  return {
    subjectId: input.subjectId,
    caScore: ca,
    examScore: exam,
    totalScore,
    letterGrade,
    gpa,
    remark,
  };
}

/** Returns the first scale entry whose [minScore, maxScore] contains the score. */
export function findScaleEntry(
  scale: ResultScale & { entries: ResultScaleEntry[] },
  score: number,
): ResultScaleEntry | null {
  return (
    scale.entries.find((e) => score >= e.minScore && score <= e.maxScore) ??
    null
  );
}
