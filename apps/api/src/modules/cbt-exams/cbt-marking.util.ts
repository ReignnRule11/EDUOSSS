import type { Question } from "@prisma/client";

/** Answer shapes stored in ExamAttempt.answers:
 *  MULTIPLE_CHOICE: { questionId: optionId }
 *  TRUE_FALSE:      { questionId: boolean }
 *  FILL_BLANK:      { questionId: string[] }   (one entry per blank)
 *  MATCHING:        { questionId: { leftId: rightId } }
 *  ESSAY:           { questionId: string }
 */

export interface MarkedQuestion {
  questionId: string;
  /** Raw score achieved (0..maxPoints, may be fractional). */
  score: number;
  maxPoints: number;
  /** true when fully correct, false when wrong or partially correct. */
  correct: boolean;
  /** True when the question can be auto-marked. */
  autoGraded: boolean;
  /** Human-readable feedback for result display. */
  feedback: string;
}

export interface MarkResult {
  totalScore: number;
  autoScore: number;
  /** Question-level breakdown keyed by questionId. */
  questions: Record<string, MarkedQuestion>;
}

export interface MarkOptions {
  negativeMarking?: boolean;
  negativeMarkingValue?: number;
}

const normalize = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const applyNegative = (
  achieved: number,
  wrongScore: number,
  negativeMarking?: boolean,
  negativeMarkingValue?: number,
): number => {
  if (!negativeMarking) return wrongScore;
  // A wrong answer deducts `value * maxPoints`. The per-question score may be
  // negative; only the overall total is clamped to zero below.
  return wrongScore - (negativeMarkingValue ?? 0) * achieved;
};

/**
 * Auto-marks a set of answers against the exam questions.
 * Essay questions are not graded here (returned with score 0 and
 * autoGraded=false so staff can review them).
 */
export function markAttempt(
  questions: Question[],
  answers: Record<string, unknown>,
  options: MarkOptions = {},
): MarkResult {
  const questionsResult: Record<string, MarkedQuestion> = {};
  let autoScore = 0;

  for (const question of questions) {
    const maxPoints = question.points ?? 1;
    const answer = answers[question.id];
    const isAnswered = answer !== undefined && answer !== null && answer !== "";

    const base: Omit<MarkedQuestion, "score" | "correct" | "feedback"> = {
      questionId: question.id,
      maxPoints,
      autoGraded: question.type !== "ESSAY",
    };

    if (question.type === "ESSAY") {
      questionsResult[question.id] = {
        ...base,
        score: 0,
        correct: false,
        feedback: "Awaiting manual review",
      };
      continue;
    }

    if (!isAnswered) {
      questionsResult[question.id] = {
        ...base,
        score: 0,
        correct: false,
        feedback: "Not answered",
      };
      continue;
    }

    let score = 0;
    let correct = false;
    let feedback = "";

    switch (question.type) {
      case "MULTIPLE_CHOICE": {
        const correctAnswer = (
          question.correctAnswer as {
            optionId?: string;
          }
        )?.optionId;
        if (correctAnswer && String(answer) === correctAnswer) {
          score = maxPoints;
          correct = true;
          feedback = "Correct";
        } else {
          score = applyNegative(
            maxPoints,
            0,
            options.negativeMarking,
            options.negativeMarkingValue,
          );
          feedback = "Incorrect";
        }
        break;
      }
      case "TRUE_FALSE": {
        const correctValue = (
          question.correctAnswer as {
            value?: boolean;
          }
        )?.value;
        if (correctValue === Boolean(answer)) {
          score = maxPoints;
          correct = true;
          feedback = "Correct";
        } else {
          score = applyNegative(
            maxPoints,
            0,
            options.negativeMarking,
            options.negativeMarkingValue,
          );
          feedback = "Incorrect";
        }
        break;
      }
      case "FILL_BLANK": {
        const acceptable =
          (
            question.correctAnswer as {
              answers?: string[];
            }
          )?.answers ?? [];
        const provided = Array.isArray(answer) ? answer : [answer];
        const blanks = Math.max(acceptable.length, provided.length);
        const perBlank = maxPoints / blanks;
        let correctBlanks = 0;
        for (let i = 0; i < acceptable.length; i += 1) {
          const accepted = (acceptable[i] ?? "")
            .split("|")
            .map((a) => a.trim().toLowerCase());
          const given = normalize(provided[i]);
          if (given !== "" && accepted.includes(given)) correctBlanks += 1;
        }
        score = correctBlanks * perBlank;
        correct = correctBlanks === acceptable.length;
        feedback = `${correctBlanks}/${acceptable.length} blank(s) correct`;
        break;
      }
      case "MATCHING": {
        const pairs =
          (
            question.correctAnswer as {
              pairs?: Array<{ leftId: string; rightId: string }>;
            }
          )?.pairs ?? [];
        const mapping = (answer ?? {}) as Record<string, string>;
        const perPair = maxPoints / Math.max(pairs.length, 1);
        let correctPairs = 0;
        for (const pair of pairs) {
          if (mapping[pair.leftId] === pair.rightId) correctPairs += 1;
        }
        score = correctPairs * perPair;
        correct = correctPairs === pairs.length;
        feedback = `${correctPairs}/${pairs.length} pair(s) matched`;
        break;
      }
      default:
        break;
    }

    questionsResult[question.id] = {
      ...base,
      score,
      correct,
      feedback,
    };
    autoScore += score;
  }

  // Clamp to zero when negative marking drags the score below zero.
  autoScore = Math.max(0, autoScore);

  return {
    totalScore: autoScore,
    autoScore,
    questions: questionsResult,
  };
}

/** Recomputes the total score after essay scores are added. */
export function combineScores(
  autoScore: number,
  essayScores: Record<string, number>,
): number {
  const essays = Object.values(essayScores ?? {}).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );
  return Math.max(0, autoScore + essays);
}
