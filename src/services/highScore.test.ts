import { describe, it, expect } from "@jest/globals";
import { isNewRecord, pickBest } from "./highScore";

describe("isNewRecord", () => {
  it("is true when the score beats the previous best", () => {
    expect(isNewRecord(10, 11)).toBe(true);
  });

  it("is false on a tie (matching the best is not a record)", () => {
    expect(isNewRecord(10, 10)).toBe(false);
  });

  it("is false when the score is lower", () => {
    expect(isNewRecord(10, 4)).toBe(false);
  });

  it("treats the first positive score (prev 0) as a record", () => {
    expect(isNewRecord(0, 1)).toBe(true);
  });

  it("never counts a score of 0 as a record", () => {
    expect(isNewRecord(0, 0)).toBe(false);
  });
});

describe("pickBest", () => {
  it("returns the higher of the two", () => {
    expect(pickBest(10, 4)).toBe(10);
    expect(pickBest(10, 25)).toBe(25);
  });

  it("returns the score on the first run", () => {
    expect(pickBest(0, 7)).toBe(7);
  });

  it("is unchanged on a tie", () => {
    expect(pickBest(10, 10)).toBe(10);
  });
});
