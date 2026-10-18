// veramed — quiz scoring logic.
//
// This module is deliberately pure: it takes the questions and products it
// should score against rather than importing them. The caller resolves
// those first (a Supabase read — see lib/data.ts). Reaching into data
// fetching from here would tie scoring to one data source and make it
// untestable.

import { Product, QuizAnswerState, QuizQuestion, QuizResult } from "./types";

/** Published products the manager has opted into the quiz. */
export function filterQuizEligible(products: Product[]): Product[] {
  return products.filter((p) => p.status === "active" && p.includeInQuiz);
}

/**
 * Score a completed quiz and return the best-matching product(s).
 *
 * 1. Sum points per category from the visitor's answers
 * 2. Find the top category (or top two, on a near-tie)
 * 3. Recommend products tagged with that category, ordered by boostScore
 *    (plan §2 — boost only orders within an already-relevant match, it
 *    never introduces an irrelevant one)
 *
 * @param questions        that brand's own quiz questions, already resolved
 * @param eligibleProducts that brand's own quiz-eligible products, already resolved
 */
export function scoreQuiz(
  questions: QuizQuestion[],
  eligibleProducts: Product[],
  answers: QuizAnswerState[]
): QuizResult[] {
  const categoryScores: Record<string, number> = {};

  for (const given of answers) {
    const question = questions.find((q) => q.id === given.questionId);
    const answer = question?.answers.find((a) => a.id === given.answerId);
    if (!answer) continue;
    categoryScores[answer.category] =
      (categoryScores[answer.category] ?? 0) + answer.points;
  }

  const ranked = Object.entries(categoryScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a);

  if (ranked.length === 0) return [];

  const topScore = ranked[0][1];
  // Include any category within 1 point of the top as a near-tie (top two).
  const topCategories = ranked
    .filter(([, score]) => score >= topScore - 1)
    .map(([category]) => category);

  const matches: QuizResult[] = [];
  for (const product of eligibleProducts) {
    const matchedCategory = topCategories.find((c) =>
      product.categories.includes(c)
    );
    if (matchedCategory) {
      matches.push({
        product,
        matchedCategory,
        score: categoryScores[matchedCategory],
      });
    }
  }

  matches.sort((a, b) => b.product.boostScore - a.product.boostScore);

  return matches;
}
