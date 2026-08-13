import React, { useEffect, useState, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useSmartMenuStore, useMathStore, useEditorStore } from '@stores/StoreContext';
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { MMLInspector as ML } from '@utils/MMLInspector';
import { getBrowser } from '@utils/deviceCapabilities';
import { ARG_ID_CHAR, applyChromiumDelimiterFix } from '@constants';
import { IconSearch } from '@tabler/icons-react';
import lme from 'lme';
import './SmartMenu.scss';

const renderLatex = (latex) => {
  try {
    const html = lme.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      output: 'mathml',
      browser: getBrowser(),
    });
    return { __html: html };
  } catch (error) {
    console.error('lme rendering error:', error);
    return { __html: latex };
  }
};

const CompoundActionItem = observer(({ result, isSelected, activeSubIndex }) => {
  const itemRef = useRef(null);
  const editorStore = useEditorStore();

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [isSelected]);

  const handleSubActionClick = (subAction) => {
    // If it has an execute function (array mutations), use it
    if (typeof subAction.execute === 'function') {
      subAction.execute();
    }
    // Otherwise treat it as a regular result with latex
    else if (subAction.latex) {
      editorStore.insertSmartMenuResult(subAction);
    }
  };

  const renderSubActionLabel = (subAction) => {
    // If label looks like LaTeX (starts with backslash), render it
    if (subAction.label && subAction.label.startsWith('\\')) {
      const rendered = renderLatex(subAction.label);
      return <span dangerouslySetInnerHTML={rendered} />;
    }
    // Otherwise return as plain text
    return subAction.label;
  };

  return (
    <div
      ref={itemRef}
      className={`result-item compound-action ${isSelected ? 'selected' : ''}`}
    >
      {result.label && <div className="compound-label">{result.label}</div>}
      <div className="sub-actions">
        {result.subActions.map((subAction, idx) => (
          <button
            key={idx}
            className={`sub-action-btn ${isSelected && idx === activeSubIndex ? 'active' : ''} ${subAction.isGolden ? 'golden' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSubActionClick(subAction);
            }}
          >
            {renderSubActionLabel(subAction)}
          </button>
        ))}
      </div>
    </div>
  );
});

const ResultItem = observer(({ result, isSelected, onClick }) => {
  const itemRef = useRef(null);
  const previewRef = useRef(null);
  const editorStore = useEditorStore();

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [isSelected]);

  const handleClick = useCallback(() => {
    onClick(result);
  }, [result, onClick]);

  const { injectionHintElement, injectionArgNumber, anchorElement, modifiedTex } = editorStore.getSymbolContext(result) || {};

  const symbol = {
    ...result,
    latex: modifiedTex || result.latex,
  };

  let renderedHtml;

  let tex = null;
  if (symbol?.display !== "none") {
    tex = symbol?.display || symbol.latex;
  }


  if (!result.displayNode && symbol?.display !== "none") {
    // Replace placeholder if injection argument is given
    if (injectionArgNumber && tex) {
      tex = TP.replacePlaceholder(tex, ARG_ID_CHAR, injectionArgNumber);
    }

    // DUPLICATE CODE should factorize a common method for both this and SymbolPad

    // Clean and render
    const cleanLatex = TP.stripPlaceholders(tex);
    renderedHtml = renderLatex(cleanLatex).__html;

    // Parse HTML to modify DOM as needed
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHtml, "text/html");
    const semanticsElement = doc.querySelector("semantics");
    const mainMrow = semanticsElement?.firstElementChild;

    if (mainMrow && ML.isType(mainMrow, "mrow")) {
      // Handle injection hint
      if (injectionArgNumber) {
        const injectionTarget = [...mainMrow.querySelectorAll("mtext")]
          .find(el => el.textContent.trim() === ARG_ID_CHAR)?.parentElement;

        if (injectionTarget) {
          injectionTarget.innerHTML = '';
          injectionTarget.classList.add('injection-hint');

          let injection = null;
          if (injectionHintElement) {
            injection = injectionHintElement.cloneNode(true);
            injectionTarget.classList.add('single');
          } else {
            // Build [ ... ] but hide brackets, only keep height
            const leftBracket = document.createElementNS('http://www.w3.org/1998/Math/MathML', "mo");
            leftBracket.textContent = "[";
            leftBracket.style.visibility = "hidden";
            leftBracket.style.width = "0";
            leftBracket.style.fontSize = "0.75em";

            const dots = document.createElementNS('http://www.w3.org/1998/Math/MathML', "mi");
            dots.textContent = "...";

            const rightBracket = document.createElementNS('http://www.w3.org/1998/Math/MathML', "mo");
            rightBracket.textContent = "]";
            rightBracket.style.visibility = "hidden";
            rightBracket.style.width = "0";
            rightBracket.style.fontSize = "0.75em";

            injection = document.createDocumentFragment();
            injection.appendChild(leftBracket);
            injection.appendChild(dots);
            injection.appendChild(rightBracket);
          }

          injectionTarget.appendChild(injection);
        }
      }

      renderedHtml = doc.body.innerHTML;
    }
  }

  // Apply Chromium delimiter fix after rendering
  useEffect(() => {
    if (itemRef.current) {
      const previewEl = itemRef.current.querySelector('.result-preview');
      if (previewEl) {
        applyChromiumDelimiterFix(previewEl);
      }
    }
  }, [renderedHtml]);

  const className = `
    result-item
    ${isSelected ? ' selected' : ''}
    ${result.type === 'transform' ? ' transform' : ''}
    ${result.isVariant ? ' variant' : ''}
    ${result.type === 'text_formatting' ? ' text-formatting' : ''}
  `;

  return (
    <div ref={itemRef} className={className} onClick={handleClick}>
      <div className="result-content">
        { tex && (
          <div className={`result-preview ${(symbol?.classes ?? []).join(' ')}`}>
            {result.displayNode ? (
              // If the result provides a React node (e.g. <Icon... />)
              <span className="preview custom-node">{result.displayNode}</span>
            ) : renderedHtml ? (
              // Otherwise, fall back to lme rendering
              <span
                className="preview"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : null}
          </div>
        )}
        <div className="result-info">
          {(result.name ?? result.keywords?.[0]) && (
            <div className="result-info">
              <span className="result-name">
                {result.name ?? result.keywords[0].toUpperCase()}
                {result.category && (
                  <span className="result-category">· {result.category}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function SmartMenu() {
  const smartMenuStore = useSmartMenuStore();
  const editorStore = useEditorStore();
  const inputRef = useRef(null);
  const [overlayRect, setOverlayRect] = useState(null);

  const setOverlayRef = useCallback((node) => {
    if (node) {
      setOverlayRect(node.getBoundingClientRect());
    }
  }, []);

  // Auto-focus input when menu opens
  useEffect(() => {
    if (smartMenuStore.isOpen && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, [smartMenuStore.isOpen]);

  const setMenuRef = useCallback((node) => {
    if (node) {
      smartMenuStore.setMenuElement(node);
    }
  }, []);

  // Handle search input changes
  const handleSearchChange = useCallback((e) => {
    smartMenuStore.setSearchQuery(e.target.value);
  }, [smartMenuStore]);

  // Position the menu near the cursor
  const getMenuStyle = () => {
    const { x, y } = smartMenuStore.position;
    const menuWidth = 320;
    const menuHeight = 400;
    const padding = 10;

    const overlayLeft = overlayRect?.left ?? 0;
    const overlayTop = overlayRect?.top ?? 0;

    /* ---------- Vertical ---------- */
    let top = y - overlayTop + 10;
    const maxTop = window.innerHeight - menuHeight - padding - overlayTop;

    if (top > maxTop) {
      top = Math.max(maxTop, padding);
    }

    /* ---------- Horizontal ---------- */
  const leftAlign = x - overlayLeft + padding;
  const rightAlign = x - overlayLeft - menuWidth - padding;
  const wouldOverflowRight = x + menuWidth + padding > window.innerWidth;
  const left = wouldOverflowRight ? rightAlign : leftAlign;

    return {
      position: 'absolute',
      top: `${top}px`,
      width: `${menuWidth}px`,
      height: `${menuHeight}px`,
      display: 'flex',
      flexDirection: 'column',
      left: `${left}px`,
    };
  };

  if (!smartMenuStore.isOpen) {
    return null;
  }

  return (
    <div
      ref={setOverlayRef}
      className="vieta-root smart-menu-overlay"
    >
      <div
        className="smart-menu"
        style={getMenuStyle()}
        ref={setMenuRef}
      >
        <div className="smart-menu-header">
          <div className="search-container">
            <IconSearch size={12} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search symbols, matrices, text..."
              value={smartMenuStore.searchQuery}
              onChange={handleSearchChange}
              className="search-input"
              aria-label="Smart menu search"
              aria-describedby="smart-menu-hint"
            />
          </div>
          <div id="smart-menu-hint" className="search-hint">
            Use ↑↓ to navigate
          </div>
        </div>

        <div className="smart-menu-content">
          {smartMenuStore.results.length > 0 ? (
            <div className="results-container">
              {smartMenuStore.results.map((result, index) => {
                const isSelected = index === smartMenuStore.selectedIndex;

                if (result.type === 'compound') {
                  return (
                    <CompoundActionItem
                      key={result.id}
                      result={result}
                      isSelected={isSelected}
                      activeSubIndex={smartMenuStore.selectedSubIndex}
                    />
                  );
                }

                return (
                  <ResultItem
                    key={result.latex + index}
                    result={result}
                    isSelected={isSelected}
                    onClick={(result) => editorStore.insertSmartMenuResult(result)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="no-results">
              {smartMenuStore.searchQuery ? (
                <>
                  <div className="no-results-message">No results found</div>
                  <div className="no-results-hint">
                    Try searching for symbols, "3x3 matrix", "text bold", or "unit"
                  </div>
                </>
              ) : (
                <>
                  <div className="no-results-message">Start typing to search</div>
                  <div className="no-results-hint">
                    Search for symbols, matrices, text formatting, and more
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default observer(SmartMenu);
