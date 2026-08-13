// src/utils/searchUtils.js

/**
 * Compute a relevance score for a symbol search.
 *
 * Features:
 * - Ignores LaTeX with braces (not useful to search).
 * - Primary: LaTeX (backslash stripped).
 * - Secondary: keywords (split into words as well).
 * - Tertiary: extra text (treated like last keyword, also split).
 * - Progressive matching: exact > startsWith > contains.
 * - Query expansion: query is split into words and scored individually.
 *   Whole query has full weight, split words have reduced weight.
 * - Cumulative: scores for multiple tokens are added but capped.
 */

export function getSearchScore(latex, keywords = [], extraText = '', query, maxScore = 100) {
  if (!query) return 0;

  const parts = expandParts(latex, keywords, extraText);
  const queryTokens = expandQuery(query);

  let totalScore = 0;

  queryTokens.forEach((token, idx) => {
    const baseScore = scoreToken(parts, token, maxScore);
    const weight = idx === 0 ? 1 : 0.7; // weaken split query words
    totalScore += baseScore * weight;
  });

  return Math.min(totalScore, maxScore);
}

const SYNONYM_GROUPS = [
  ['add', 'insert', 'create', 'new', 'append'],
  ['delete', 'remove', 'erase', 'clear', 'drop'],
  ['move', 'shift', 'reorder', 'relocate'],
  ['align', 'justify', 'position'],
  ['row', 'line', 'record'],
  ['column', 'col', 'field'],
  ['left', 'start', 'first'],
  ['right', 'end', 'last', 'side'],
  ['up', 'above', 'top', 'higher'],
  ['down', 'below', 'bottom', 'lower'],
];

const SYNONYM_MAP = {};
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    SYNONYM_MAP[word] = group.filter(w => w !== word);
  }
}

/**
 * Expand searchable parts from LaTeX, keywords, and extra text.
 * - Keep each keyword whole.
 * - Also add split words (ordered after full form).
 * - Extra text treated as last keyword.
 */
function expandParts(latex, keywords, extraText) {
  const parts = [];

  if (latex) {
    // Match: \command{argument}
    const m = latex.match(/^\\([a-zA-Z]+)\{([^}]*)\}$/);

    if (m) {
      const command = m[1];
      const inner   = m[2];

      // Define placeholder rule
      const isPlaceholder = /^Ꞩ\d+$/.test(inner);

      if (isPlaceholder) {
        parts.push(command.toLowerCase());
      }

    } else if (!latex.includes('{')) {
      // original logic for commands without arguments
      parts.push(latex.replace(/^\\/, '').toLowerCase());
    }
  }

  keywords?.forEach(k => {
    const lower = k.toLowerCase();
    parts.push(lower);

    // Split into words and expand each
    const words = lower.split(/\s+/).filter(Boolean);
    for (const w of words) {
      parts.push(w);
      const syns = SYNONYM_MAP[w];
      if (syns) parts.push(...syns);
    }
  });

  if (extraText) {
    const lower = extraText.toLowerCase();
    parts.push(lower);
    const words = lower.split(/\s+/).filter(Boolean);
    for (const w of words) {
      parts.push(w);
      const syns = SYNONYM_MAP[w];
      if (syns) parts.push(...syns);
    }
  }

  return Array.from(new Set(parts)); // unique set
}

/**
 * Expand query into whole string + words.
 */
function expandQuery(query) {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  return Array.from(new Set([lower, ...words]));
}

/**
 * Score a single token against parts using progressive rules.
 */
function scoreToken(parts, token, maxScore) {
  const downweightIfGeneric = (score, part) => {
    // Downweight if token or matched part contains "function"
    if (token.includes('function') || part.includes('function')) {
      return Math.floor(score * 0.5); // cut score in half
    }
    return score;
  };

  // 1. Exact match
  const exactIndex = parts.findIndex(p => p === token);
  if (exactIndex !== -1) {
    let score;
    if (exactIndex === 0) {
      score = maxScore; // LaTeX exact match
    } else {
      score = Math.max(maxScore - 10 - (exactIndex - 1) * 5, maxScore - 25);
    }
    return downweightIfGeneric(score, parts[exactIndex]);
  }

  // 2. StartsWith match
  const startsWithIndex = parts.findIndex(p => p.startsWith(token));
  if (startsWithIndex !== -1) {
    const keyword = parts[startsWithIndex];
    let i = 0;
    while (i < token.length && keyword[i] === token[i]) i++;
    const fraction = i / token.length;

    let score;
    if (startsWithIndex === 0) {
      // LaTeX startsWith
      score = Math.floor(maxScore * 0.8 + fraction * (maxScore * 0.15)); // ~80–95
    } else {
      // Keyword startsWith
      score = Math.max(
        Math.floor(maxScore * 0.75 + fraction * (maxScore * 0.1)) - (startsWithIndex - 1) * 3,
        maxScore * 0.6
      );
    }
    return downweightIfGeneric(score, keyword);
  }

  // 3. Contains anywhere
  const containsIndex = parts.findIndex(p => p.includes(token));
  if (containsIndex !== -1) {
    const part = parts[containsIndex];
    const score = Math.floor(maxScore * 0.6);
    return downweightIfGeneric(score, part);
  }

  return 0;
}
