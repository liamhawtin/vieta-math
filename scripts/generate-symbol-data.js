const fs = require('fs');
const path = require('path');
const {
  symbol_categories,
  symbolVariants,
  negatableSymbols,
  autoScalableDelimiters,
  defaultFrequentlyUsedSymbols
} = require('../data/symbols');

// File paths
const outputPath = path.join(__dirname, '../data/symbolpad-data.json');
const defaultSymbolsPath = path.join(__dirname, '../data/default-symbols.json');
const symbolsPath = path.join(__dirname, '../data/symbols.js');
const scriptPath = __filename;

// Determine whether regeneration is necessary
const needsRegeneration = () => {
  if (!fs.existsSync(outputPath) || !fs.existsSync(defaultSymbolsPath)) {
    console.log('Output file(s) missing, generating...');
    return true;
  }

  try {
    const outputStat = fs.statSync(outputPath);
    const defaultStat = fs.statSync(defaultSymbolsPath);
    const symbolsStat = fs.statSync(symbolsPath);
    const scriptStat = fs.statSync(scriptPath);

    if (
      symbolsStat.mtime > outputStat.mtime ||
      symbolsStat.mtime > defaultStat.mtime ||
      scriptStat.mtime > outputStat.mtime ||
      scriptStat.mtime > defaultStat.mtime
    ) {
      console.log('Source files have changed, regenerating...');
      return true;
    }

    console.log('All output files are up to date. Skipping regeneration.');
    return false;
  } catch (err) {
    console.warn('Error checking timestamps. Regenerating by default:', err.message);
    return true;
  }
};

// Exit early if regeneration not needed
if (!needsRegeneration()) {
  process.exit(0);
}

// Delete old files if they exist
[outputPath, defaultSymbolsPath].forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});

const injectVariants = (symbolCategories, symbolVariants, negatableSymbols) => {
  const deepCopy = JSON.parse(JSON.stringify(symbolCategories));

  const isNegatable = latex => negatableSymbols.includes(latex);

  const createNegatedVariant = (latex, originalKeywords = []) => {
    const firstKeyword = originalKeywords?.[0];
    const keywords = [];
    if (firstKeyword) keywords.push(`not ${firstKeyword}`);
    keywords.push('not');
    return { latex: `\\not ${latex}`, keywords };
  };

  for (const tab of deepCopy.tabs) {
    for (const category of tab.categories) {
      for (const symbol of category.symbols) {
        const baseLatex = symbol.latex;
        const variantKey = symbol.id || baseLatex;
        symbol.variants = [];
        const addedLatexes = new Set();

        const addVariant = variant => {
          if (!variant || !variant.latex) return;
          if (!addedLatexes.has(variant.latex)) {
            symbol.variants.push(variant);
            addedLatexes.add(variant.latex);
          }
        };

        // 1️⃣ Negated base symbol
        if (isNegatable(baseLatex)) {
          addVariant(createNegatedVariant(baseLatex, symbol.keywords || []));
        }

        // 2️⃣ ID-based variants (fallback to latex if no id)
        const variants = symbolVariants[variantKey] || [];

        for (const variant of variants) {
          addVariant(variant);

          if (isNegatable(variant.latex)) {
            addVariant(createNegatedVariant(variant.latex, variant.keywords || []));
          }
        }

        // 3️⃣ Auto-scaled delimiter (still latex-based)
        if (category.autoScalable) {
          const autoDelimiter = autoScalableDelimiters[baseLatex];
          if (autoDelimiter) {
            symbol.autoScaled = {
              latex: autoDelimiter.latex,
              display: autoDelimiter.display,
              keywords: [
                `auto ${symbol.keywords?.[0]}`,
                'auto',
                'auto-scaling',
                'scaling',
                ...(symbol.keywords || [])
              ]
            };
          }
        }
      }
    }
  }

  return deepCopy;
};

const enhancedCategories = injectVariants(
  symbol_categories,
  symbolVariants,
  negatableSymbols
);

fs.writeFileSync(outputPath, JSON.stringify(enhancedCategories, null, 2), 'utf8');
fs.writeFileSync(defaultSymbolsPath, JSON.stringify(defaultFrequentlyUsedSymbols, null, 2), 'utf8');
