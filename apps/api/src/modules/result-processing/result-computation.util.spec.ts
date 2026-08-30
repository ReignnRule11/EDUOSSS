import type { ResultScale, ResultScaleEntry } from "@prisma/client";

import { computeSubject, findScaleEntry } from "./result-computation.util";

function scale(entries: Array<Partial<ResultScaleEntry>>): ResultScale & {
  entries: ResultScaleEntry[];
} {
  return {
    id: "scale1",
    tenantId: "t1",
    name: "Test",
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    entries: entries.map((e, i) => ({
      id: `e${i}`,
      tenantId: "t1",
      scaleId: "scale1",
      minScore: 0,
      maxScore: 100,
      letterGrade: "A",
      gpa: 5,
      remark: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...e,
    })) as ResultScaleEntry[],
  } as ResultScale & { entries: ResultScaleEntry[] };
}

const SCALE = scale([
  {
    minScore: 70,
    maxScore: 100,
    letterGrade: "A",
    gpa: 5,
    remark: "Excellent",
  },
  { minScore: 50, maxScore: 69.99, letterGrade: "C", gpa: 3, remark: "Good" },
  { minScore: 0, maxScore: 49.99, letterGrade: "F", gpa: 1, remark: "Fail" },
]);

describe("findScaleEntry", () => {
  it("finds the entry whose range contains the score", () => {
    expect(findScaleEntry(SCALE, 85)?.letterGrade).toBe("A");
    expect(findScaleEntry(SCALE, 60)?.letterGrade).toBe("C");
    expect(findScaleEntry(SCALE, 20)?.letterGrade).toBe("F");
  });

  it("returns null when the scale has no matching entry", () => {
    expect(findScaleEntry(scale([]), 50)).toBeNull();
  });
});

describe("computeSubject", () => {
  it("computes the weighted total from CA + exam", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: 80, examScore: 70 },
      SCALE,
      0.3,
      0.7,
    );
    // 80*0.3 + 70*0.7 = 24 + 49 = 73
    expect(result.totalScore).toBe(73);
    expect(result.letterGrade).toBe("A");
    expect(result.gpa).toBe(5);
  });

  it("uses the CA score alone when exam is missing", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: 55, examScore: null },
      SCALE,
      0.3,
      0.7,
    );
    expect(result.totalScore).toBe(55);
    expect(result.letterGrade).toBe("C");
  });

  it("uses the exam score alone when CA is missing", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: null, examScore: 40 },
      SCALE,
      0.3,
      0.7,
    );
    expect(result.totalScore).toBe(40);
    expect(result.letterGrade).toBe("F");
  });

  it("returns a null total when neither component is present", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: null, examScore: null },
      SCALE,
      0.3,
      0.7,
    );
    expect(result.totalScore).toBeNull();
    expect(result.letterGrade).toBeNull();
  });

  it("resolves no grade when no scale is provided", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: 80, examScore: 70 },
      null,
      0.3,
      0.7,
    );
    expect(result.totalScore).toBe(73);
    expect(result.letterGrade).toBeNull();
  });

  it("rounds fractional totals to two decimals", () => {
    const result = computeSubject(
      { subjectId: "s1", caScore: 33.33, examScore: 66.66 },
      SCALE,
      0.3,
      0.7,
    );
    expect(result.totalScore).toBe(56.66);
  });
});
