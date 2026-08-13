// mapping.js
// Unicode-based font-variant mappings for exactly these five categories:
//   \mathsf (sans-serif) — Latin A–Z, a–z, digits
//   \mathtt (monospace)  — Latin A–Z, a–z, digits
//   \mathbb (double-struck) — Latin A–Z, a–z, digits (+ classic BMP overrides)
//   \mathcal (calligraphic/script) — Latin A–Z only (+ classic BMP overrides)
//   \mathfrak (fraktur) — Latin A–Z, a–z (+ classic BMP overrides)
//
// Notes:
// - These are codepoint transforms per Unicode’s Mathematical Alphanumeric Symbols + Letterlike Symbols.
// - We intentionally do NOT include Greek/Hebrew transforms (LaTeX doesn’t support them here).
// - Italic/bold/upright are styling concerns (CSS/MathML), not codepoint transforms here.
// - Apply rule: for each char, check overrides first; otherwise use the first matching range.
// - styled = base + (cp - rangeStart)

export const mappings = {
  // \mathsf — Mathematical Sans-Serif (Latin + digits)
  mathsf: {
    ranges: [
      { range: [0x41, 0x5A], base: 0x1D5A0 }, // A–Z → 𝖠–𝖹
      { range: [0x61, 0x7A], base: 0x1D5BA }, // a–z → 𝖺–𝗓
      { range: [0x30, 0x39], base: 0x1D7E2 }, // 0–9 → 𝟢–𝟫
    ],
    overrides: {},
  },

  // \mathtt — Mathematical Monospace (Latin + digits)
  mathtt: {
    ranges: [
      { range: [0x41, 0x5A], base: 0x1D670 }, // A–Z → 𝙰–𝚉
      { range: [0x61, 0x7A], base: 0x1D68A }, // a–z → 𝚊–𝚣
      { range: [0x30, 0x39], base: 0x1D7F6 }, // 0–9 → 𝟶–𝟿
    ],
    overrides: {},
  },

  // \mathbb — Mathematical Double-Struck (Latin + digits)
  // Classic BMP overrides replace these capitals with legacy code points.
  mathbb: {
    ranges: [
      { range: [0x41, 0x5A], base: 0x1D538 }, // A–Z → 𝔸–𝕐 (with overrides below)
      //{ range: [0x61, 0x7A], base: 0x1D552 }, // a–z → 𝕒–𝕫
      //{ range: [0x30, 0x39], base: 0x1D7D8 }, // 0–9 → 𝟘–𝟡
    ],
    overrides: {
      0x43: 0x2102, // C → ℂ
      0x48: 0x210D, // H → ℍ
      0x4E: 0x2115, // N → ℕ
      0x50: 0x2119, // P → ℙ
      0x51: 0x211A, // Q → ℚ
      0x52: 0x211D, // R → ℝ
      0x5A: 0x2124, // Z → ℤ
    },
  },

  // \mathcal — Calligraphic/Script (capitals only in this transform)
  // Unicode provides lowercase “script”, but LaTeX’s \mathcal is traditionally capitals-only.
  // We implement capitals-only here, with the standard BMP overrides.
  mathcal: {
    ranges: [
      { range: [0x41, 0x5A], base: 0x1D49C }, // A–Z → 𝒜–𝒵 (with overrides below)
    ],
    overrides: {
      0x42: 0x212C, // B → ℬ
      0x45: 0x2130, // E → ℰ
      0x46: 0x2131, // F → ℱ
      0x48: 0x210B, // H → ℋ
      0x49: 0x2110, // I → ℐ
      0x4C: 0x2112, // L → ℒ
      0x4D: 0x2133, // M → ℳ
      0x52: 0x211B, // R → ℛ
    },
  },

  // \mathfrak — Fraktur (Latin)
  // Capitals have the classic BMP overrides; lowercase are contiguous in MAS.
  mathfrak: {
    ranges: [
      { range: [0x41, 0x5A], base: 0x1D504 }, // A–Z → 𝔄–𝔜 (with overrides below)
      { range: [0x61, 0x7A], base: 0x1D51E }, // a–z → 𝔞–𝔷
    ],
    overrides: {
      0x43: 0x212D, // C → ℭ
      0x48: 0x210C, // H → ℌ
      0x49: 0x2111, // I → ℑ
      0x52: 0x211C, // R → ℜ
      0x5A: 0x2128, // Z → ℨ
    },
  },
};

// Optional helper: apply a mapping spec to a single codepoint
export function styleCodepoint(cp, styleSpec) {
  if (!styleSpec) return cp;
  if (styleSpec.overrides && styleSpec.overrides[cp]) return styleSpec.overrides[cp];
  if (styleSpec.ranges) {
    for (const { range: [a, b], base } of styleSpec.ranges) {
      if (cp >= a && cp <= b) return base + (cp - a);
    }
  }
  return cp; // unchanged if no mapping
}

// char: a single-character string
// font: one of "mathsf", "mathtt", "mathbb", "mathcal", "mathfrak"
// returns: the styled character string (or the original if no mapping exists)
export function styleChar(char, font) {
    if (!char || !font) return char;

    const cp = char.codePointAt(0);
    if (cp === undefined) return char;

    const spec = mappings[font];
    if (!spec) return char;

    // 1. Check overrides first
    if (spec.overrides && spec.overrides[cp]) {
        return String.fromCodePoint(spec.overrides[cp]);
    }

    // 2. Then check ranges
    if (spec.ranges) {
        for (const { range: [a, b], base } of spec.ranges) {
            if (cp >= a && cp <= b) {
                return String.fromCodePoint(base + (cp - a));
            }
        }
    }

    // 3. No mapping → return original
    return char;
}
