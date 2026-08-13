import React, { useCallback, useRef, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useSymbolStore, useMathStore, useEditorStore } from '@stores/StoreContext';
import {
  IconMathSymbols,
  IconHistory,
  IconRuler,
  IconMatrix,
  IconMathFunction,
  IconAlphabetGreek,
  IconLayersIntersect,
  IconArrowsHorizontal,
  IconOverline,
  IconBracketsContain,
} from '@tabler/icons-react';
import lme from 'lme';
import symbolData from '@data/symbolpad-data.json';
import './SymbolPad.scss';
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { MMLInspector as ML } from '@utils/MMLInspector';
import { getBrowser } from '@utils/deviceCapabilities';
import { ARG_ID_CHAR, applyChromiumDelimiterFix } from '@constants';

import {

} from '@tabler/icons-react';

const categoryIcons = {
  recent: <IconHistory size={18} />,
  symbol: <IconMathSymbols size={18} />,
  basic_math: <IconMathSymbols size={18} />,
  calculus_functions: <IconMathFunction size={18} />,
  letters_alphabets: <IconAlphabetGreek size={18} style={{ transform: 'scale(1.3) translateY(-1px)' }} />,
  logic_sets: <IconLayersIntersect size={18} />,
  arrows_mappings: <IconArrowsHorizontal size={18} />,
  decorative_misc: <IconOverline size={18} />,
  delimiters: <IconBracketsContain size={18} />,
  units_constants: <IconRuler size={20} />,
  matrices_arrays: <IconMatrix size={20} />,
  recent: <IconHistory size={18} />
};

const renderLatex = (latex) => {
  try {
    const html = lme.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: 'mathml',
      browser: getBrowser(),
    });
    return { __html: html };
  } catch (error) {
    console.error('lme rendering error:', error);
    return { __html: latex };
  }
};

const CategoryToggle = ({
  categoryName,
  toggleType = "auto",
  isEnabled,
  onToggle,
  tooltipText = "Auto-scaling delimiters adjust size to fit content",
  label = "Auto-scale"
}) => {
  return (
    <div className="category-toggle" title={tooltipText}>
      <label className="toggle-container">
        <span className="toggle-label">{label}</span>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
};

const SymbolButton = observer(({ initSymbol, isSelected, onClick }) => {
  const symbolStore = useSymbolStore();
  const editorStore = useEditorStore();

  const [showVariants, setShowVariants] = useState(false);
  const [leftAlign, setLeftAlign] = useState(false);
  const [alignTop, setAlignTop] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const [symbol, setSymbol] = useState(initSymbol);
  const [injectionArgNr, setInjectionArgNr] = useState(null);
  const [injectionHintEl, setInjectionHintEl] = useState(null);

  const hideVariantsTimeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  const container = document.querySelector('.symbols-container');
  const showToolTip = false;

  const hasVariants =
    Array.isArray(symbol?.variants) && symbol.variants.length > 0;

  const processLatex = (latex) => {
    if (!latex) return '';

    let tex = latex;

    if (injectionArgNr) {
      tex = TP.replacePlaceholder(tex, ARG_ID_CHAR, injectionArgNr);
    }

    const cleanLatex = TP.stripPlaceholders(tex);
    let renderedHtml = renderLatex(cleanLatex).__html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHtml, "text/html");

    const semanticsElement = doc.querySelector("semantics");
    const mainMrow = semanticsElement?.firstElementChild;

    if (mainMrow && ML.isType(mainMrow, "mrow")) {

      if (injectionArgNr) {
        const injectionTarget = [...mainMrow.querySelectorAll("mtext")]
          .find(el => el.textContent.trim() === ARG_ID_CHAR)?.parentElement;

        if (injectionTarget) {
          injectionTarget.innerHTML = '';
          injectionTarget.classList.add('injection-hint');

          let injection;

          if (injectionHintEl) {
            injection = injectionHintEl.cloneNode(true);
          } else {
            const frag = document.createDocumentFragment();
            const dots = document.createElement("mi");
            dots.textContent = "...";
            frag.appendChild(dots);
            injection = frag;
          }

          injectionTarget.appendChild(injection);
        }
      }

      if (TP.hasArgument(tex, 0)) {
        const anchor = anchorEl
          ? anchorEl.cloneNode(true)
          : document.createElement("mrow");

        anchor.classList.add('anchor');
        mainMrow.insertBefore(anchor, mainMrow.firstChild);
      }

      renderedHtml = doc.body.innerHTML;
    }

    return renderedHtml;
  };

  useEffect(() => {
    if (wrapperRef.current && container) {
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const rightSpace = containerRect.right - wrapperRect.right;
      const leftSpace = wrapperRect.right - containerRect.left;
      const bottomSpace = containerRect.bottom - wrapperRect.bottom;
      const topSpace = wrapperRect.top - containerRect.top;

      setAlignTop(bottomSpace < topSpace);
      setLeftAlign(rightSpace > leftSpace);
    }
  }, [showVariants]);

  useEffect(() => {
    const {
      injectionHintElement,
      injectionArgNumber,
      anchorElement,
      modifiedTex
    } = editorStore.getSymbolContext(initSymbol) || {};

    if (modifiedTex) {
      setSymbol({ ...initSymbol, latex: modifiedTex });
    } else {
      setSymbol(initSymbol);
    }

    setAnchorEl(anchorElement);
    setInjectionArgNr(injectionArgNumber || null);
    setInjectionHintEl(injectionHintElement);
  }, [editorStore.selection.range, symbolStore.categoryToggleStates]);

  let className = "symbol-button";
  if (hasVariants) className += " has-variants";

  const baseLatex = symbol?.display || symbol?.latex;
  const renderedHtml = processLatex(baseLatex);

  // Apply Chromium delimiter fix after rendering
  useEffect(() => {
    if (!wrapperRef.current) return;

    const el = wrapperRef.current;

    const observer = new ResizeObserver(() => {
      const lmeSymbols = el.querySelectorAll('.lme-symbol');
      lmeSymbols.forEach(symbol => {
        applyChromiumDelimiterFix(symbol);
      });
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [showVariants]);

  return (
    <div className="symbol-wrapper" ref={wrapperRef}>
      <div
        className="hover-container"
        onMouseEnter={() => {
          if (hideVariantsTimeoutRef.current) {
            clearTimeout(hideVariantsTimeoutRef.current);
            hideVariantsTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          hideVariantsTimeoutRef.current = setTimeout(() => {
            if (hasVariants) setShowVariants(false);
          }, 150);
        }}
      >
        <button
          className={className}
            onMouseDown={(e) => {
              e.preventDefault();
              if (e.button !== 0) return;
              onClick(symbol);
            }}
          aria-label={TP.stripPlaceholders(baseLatex)}
          title={showToolTip ? TP.stripMarkers(baseLatex) : undefined}
          tabIndex={0}
          {...(isSelected ? { 'aria-selected': true } : {})}
        >
          <span
            className="lme-symbol"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {hasVariants && (
            <span
              className={`variant-toggle ${showVariants ? "active" : ""}`}
              onMouseEnter={() => setShowVariants(true)}
            >
              <span className="triangle">▾</span>
            </span>
          )}
        </button>

        {showVariants && (
          <div
            className={`variant-panel fade-in ${leftAlign ? "left" : "right"} ${alignTop ? "top" : "bottom"}`}
          >
            {symbol.variants.map((variant, i) => (
              <button
                key={variant.latex + i}
                className="variant-button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (e.button !== 0) return;
                  onClick(variant);
                }}
                aria-label={`Variant: ${variant.latex}`}
                title={showToolTip ? TP.stripMarkers(variant.latex) : undefined}
              >
                <span
                  className="lme-symbol"
                  dangerouslySetInnerHTML={{
                    __html: processLatex(variant.latex)
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function SymbolPad() {
  const symbolStore = useSymbolStore();
  const mathStore = useMathStore();
  const editorStore = useEditorStore();

  const handleSymbolClick = useCallback((symbol) => {
    mathStore.insertSymbol(symbol.latex);
    symbolStore.addRecentSymbol(symbol);
  }, [mathStore, symbolStore]);

  const renderSymbolButton = useCallback((symbol, index = -1) => {
    const isSelected = index === symbolStore.selectedIndex;

    // Determine if we should use auto-scaled version
    let effectiveSymbol = symbol;

    // Check if this symbol came from search and is already auto-scaled
    if (!symbol.isAutoScaled) {
      // Check if we're in a category view with auto-scaling enabled
      const currentTab = symbolData.tabs.find(tab => tab.id === symbolStore.activeTab);
      const currentCategory = currentTab?.categories.find(cat =>
        cat.symbols.some(s => s.latex === symbol.latex)
      );

      if (currentCategory?.autoScalable &&
          symbolStore.getCategoryToggleState(currentCategory.name) &&
          symbol.autoScaled) {
        effectiveSymbol = {
          ...symbol,
          latex: symbol.autoScaled.latex,
          display: symbol.autoScaled.display
        };
      }
    }

    return (
      <SymbolButton
        key={symbol.latex + index}
        initSymbol={effectiveSymbol}
        isSelected={isSelected}
        onClick={handleSymbolClick}
      />
    );
  }, [handleSymbolClick, editorStore, symbolStore.selectedIndex, symbolStore.categoryToggleStates]);

  const renderRecentTab = () => {
    return (
      <div className="tab-content">
        <div className="symbol-results">
          <div className="symbols-grid">
            {symbolStore.recentSymbols.map(renderSymbolButton)}
          </div>
        </div>
      </div>
    );
  };

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [symbolStore.activeTab]);

  const renderSymbolsTab = () => {
    const currentTab = symbolData.tabs.find(tab => tab.id === symbolStore.activeTab);
    if (!currentTab) return null;

    return (
      <div className="tab-content">
        {currentTab.categories.map(category => (
          <div key={category.name} className="category">
            <h3 className="category-header">
              <span className="category-name">{category.name}</span>

              {category.note?.type === "HTML" && (
                <span
                  className="category-note"
                  dangerouslySetInnerHTML={{ __html: category.note.content }}
                />
              )}

              {category.autoScalable && (
                <CategoryToggle
                  categoryName={category.name}
                  isEnabled={symbolStore.getCategoryToggleState(category.name)}
                  onToggle={(enabled) =>
                    symbolStore.setCategoryToggleState(category.name, "auto", enabled)
                  }
                />
              )}
            </h3>
            <div className="symbols-grid">
              {category.symbols.map(renderSymbolButton)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const allTabs = [
    { id: 'recent', name: 'Recent', label: 'Recent' },
    ...symbolData.tabs.filter(tab => !tab.hide)
  ];

  const padRef = useRef(null);

  const [overlayOpen, setOverlayOpen] = useState(true);

  useEffect(() => {
    if (!overlayOpen) return;

    const handleClick = (e) => {
      const pad = padRef.current;
      if (pad && !pad.contains(e.target)) {
        //setOverlayOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overlayOpen]);

  const isDisabled = editorStore.isDummy;

  return (
    <div
      className={`vieta-root symbol-pad ${overlayOpen ? "open" : ""} ${isDisabled ? "disabled" : ""}`}
      ref={padRef}
      aria-disabled={isDisabled}
    >
      {/*
      <button
        className="symbolpad-toggle-btn"
        onClick={() => setOverlayOpen(o => !o)}
      >
        <IconKeyboard size={20} />
        <span className="chevron">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M18 15L12 9L6 15"
              stroke="currentColor"
              strokeWidth="0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      */}
      <nav className="navigation">
        {allTabs.map(tab => (
          <button
            key={tab.id}
            title={tab.name}
            className={`nav-item ${symbolStore.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => symbolStore.setActiveTab(tab.id)}
            aria-label={`${tab.name} symbols`}
          >
            <span className="icon">{categoryIcons[tab.id]}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="symbols-container" ref={containerRef}>
        {symbolStore.activeTab === 'recent' ? renderRecentTab() : renderSymbolsTab()}
      </div>
    </div>
  );
}

export default observer(SymbolPad);
