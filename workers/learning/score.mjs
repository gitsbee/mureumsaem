export function earned(results) {
  const scores = { correct: 3, hinted: 1, wrong: 0, seen: 0 };
  if (!results.length || !results.every(result => Object.hasOwn(scores, result))) throw new Error('Invalid results');
  const points = results.reduce((sum, result) => sum + scores[result], 0);
  return { points, xp: points + results.length };
}
