import type { Question } from "@prisma/client";

import { combineScores, markAttempt } from "./cbt-marking.util";

function question(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    tenantId: "t1",
    categoryId: null,
    createdById: "u1",
    type: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    body: "Question",
    options: null,
    correctAnswer: null,
    explanation: null,
    points: 1,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Question;
}

describe("markAttempt", () => {
  describe("MULTIPLE_CHOICE", () => {
    const mcq = question({
      id: "mcq1",
      type: "MULTIPLE_CHOICE",
      points: 2,
      correctAnswer: { optionId: "b" },
    });

    it("awards full points for the correct option", () => {
      const result = markAttempt([mcq], { mcq1: "b" });
      expect(result.questions.mcq1!.score).toBe(2);
      expect(result.questions.mcq1!.correct).toBe(true);
      expect(result.totalScore).toBe(2);
    });

    it("awards zero for an incorrect option", () => {
      const result = markAttempt([mcq], { mcq1: "a" });
      expect(result.questions.mcq1!.score).toBe(0);
      expect(result.questions.mcq1!.correct).toBe(false);
    });

    it("treats an unanswered question as not answered", () => {
      const result = markAttempt([mcq], {});
      expect(result.questions.mcq1!.score).toBe(0);
      expect(result.questions.mcq1!.feedback).toBe("Not answered");
    });
  });

  describe("TRUE_FALSE", () => {
    const tf = question({
      id: "tf1",
      type: "TRUE_FALSE",
      points: 1,
      correctAnswer: { value: true },
    });

    it("awards points when boolean matches", () => {
      const result = markAttempt([tf], { tf1: true });
      expect(result.questions.tf1!.score).toBe(1);
      expect(result.questions.tf1!.correct).toBe(true);
    });

    it("awards zero when it does not match", () => {
      const result = markAttempt([tf], { tf1: false });
      expect(result.questions.tf1!.score).toBe(0);
    });
  });

  describe("FILL_BLANK", () => {
    const fb = question({
      id: "fb1",
      type: "FILL_BLANK",
      points: 2,
      correctAnswer: { answers: ["cat", "dog|puppy"] },
    });

    it("gives partial credit per correct blank", () => {
      const result = markAttempt([fb], { fb1: ["cat", "wrong"] });
      expect(result.questions.fb1!.score).toBe(1);
      expect(result.questions.fb1!.feedback).toBe("1/2 blank(s) correct");
    });

    it("accepts alternative answers case-insensitively", () => {
      const result = markAttempt([fb], { fb1: ["CAT", "PUPPY"] });
      expect(result.questions.fb1!.score).toBe(2);
      expect(result.questions.fb1!.correct).toBe(true);
    });
  });

  describe("MATCHING", () => {
    const matching = question({
      id: "m1",
      type: "MATCHING",
      points: 3,
      correctAnswer: {
        pairs: [
          { leftId: "l1", rightId: "r1" },
          { leftId: "l2", rightId: "r2" },
          { leftId: "l3", rightId: "r3" },
        ],
      },
    });

    it("awards full points when all pairs match", () => {
      const result = markAttempt([matching], {
        m1: { l1: "r1", l2: "r2", l3: "r3" },
      });
      expect(result.questions.m1!.score).toBe(3);
      expect(result.questions.m1!.correct).toBe(true);
    });

    it("gives partial credit for some matched pairs", () => {
      const result = markAttempt([matching], {
        m1: { l1: "r1", l2: "r3", l3: "r3" },
      });
      // l1->r1 correct, l2->r3 wrong, l3->r3 correct => 2/3
      expect(result.questions.m1!.score).toBe(2);
      expect(result.questions.m1!.correct).toBe(false);
    });
  });

  describe("ESSAY", () => {
    const essay = question({ id: "e1", type: "ESSAY", points: 5 });

    it("is not auto-graded and scores zero until reviewed", () => {
      const result = markAttempt([essay], { e1: "my essay" });
      expect(result.questions.e1!.autoGraded).toBe(false);
      expect(result.questions.e1!.score).toBe(0);
      expect(result.questions.e1!.feedback).toBe("Awaiting manual review");
    });
  });

  describe("negative marking", () => {
    const mcq = question({
      id: "mcq2",
      type: "MULTIPLE_CHOICE",
      points: 4,
      correctAnswer: { optionId: "a" },
    });

    it("deducts a fraction of max points on a wrong answer", () => {
      const result = markAttempt(
        [mcq],
        { mcq2: "b" },
        {
          negativeMarking: true,
          negativeMarkingValue: 0.25,
        },
      );
      // Per-question score is negative; the total is clamped to zero.
      expect(result.questions.mcq2!.score).toBe(-1);
      expect(result.totalScore).toBe(0);
    });

    it("deducts from correct answers across questions", () => {
      const wrong = question({
        id: "mcq4",
        type: "MULTIPLE_CHOICE",
        points: 4,
        correctAnswer: { optionId: "a" },
      });
      const right = question({
        id: "mcq5",
        type: "MULTIPLE_CHOICE",
        points: 10,
        correctAnswer: { optionId: "x" },
      });
      const result = markAttempt(
        [wrong, right],
        { mcq4: "b", mcq5: "x" },
        { negativeMarking: true, negativeMarkingValue: 0.25 },
      );
      expect(result.questions.mcq4!.score).toBe(-1);
      expect(result.questions.mcq5!.score).toBe(10);
      expect(result.totalScore).toBe(9);
    });

    it("does not deduct when negative marking is disabled", () => {
      const result = markAttempt([mcq], { mcq2: "b" });
      expect(result.questions.mcq2!.score).toBe(0);
    });
  });

  it("clamps a negative total score to zero", () => {
    const mcq = question({
      id: "mcq3",
      type: "MULTIPLE_CHOICE",
      points: 1,
      correctAnswer: { optionId: "a" },
    });
    const result = markAttempt(
      [mcq],
      { mcq3: "b" },
      {
        negativeMarking: true,
        negativeMarkingValue: 0.5,
      },
    );
    expect(result.totalScore).toBe(0);
  });
});

describe("combineScores", () => {
  it("adds essay scores to the auto score", () => {
    expect(combineScores(60, { e1: 4, e2: 3 })).toBe(67);
  });

  it("handles empty essay scores", () => {
    expect(combineScores(60, {})).toBe(60);
  });
});
