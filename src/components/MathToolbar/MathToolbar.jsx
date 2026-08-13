import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import lme from 'lme';
import { observer } from 'mobx-react-lite';
import {
  IconCopy,
  IconLinkOff,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconPlus,
  IconArrowsMove,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconTrash,
  IconLineHeight,
  IconNewSection,
  IconArrowsVertical,
  IconArrowsMoveVertical,
  IconArrowsHorizontal,
  IconPhoto,
  IconDownload,
} from '@tabler/icons-react';
import { OpenAI, Wolfram } from '@utils/icons';
import { getBrowser } from '@utils/deviceCapabilities';
import { useMathStore, useEditorStore, useToolbarStateStore } from '@stores/StoreContext';
import { MMLInspector as ML } from '@utils/MMLInspector';
import { ARROW_MAPPINGS,
  TEXT_COMMAND_OPTIONS,
  FONT_COMMAND_DEFINITIONS,
  FONT_COMMAND_LABELS,
  DELIMITER_SIZE_OPTIONS,
  VALID_LOWER_FONTS,
  VALID_NUMBER_FONTS,
  VALID_OTHER_FONTS,
  LAYOUT_MODE_OPTIONS
} from '@constants';
import './MathToolbar.scss';


function wrapWithCurlyBraces(str) {
  const trimmed = str.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
  }
  return `{${trimmed}}`;
}

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

function MathToolbar() {

  const inputRef = useRef();
  const heightInputRef = useRef();
  const shiftInputRef = useRef();
  const rowSpacingInputRef = useRef();
  const wasFocusedRef = useRef(false);

  const mathStore = useMathStore();
  const editorStore = useEditorStore();
  const toolbarStateStore = useToolbarStateStore();

  // activeCategory is now managed by ToolbarStateStore
  const [activeCategory, setActiveCategory] = useState(null);
  const [fontText, setFontText] = useState('');
  const [currentFontCommand, setCurrentFontCommand] = useState(null);
  const [fontable, setFontable] = useState(false);

  const [rowSpacingValue, setRowSpacingValue] = useState(0);
  const [rowSpacingInputValue, setRowSpacingInputValue] = useState('0');
  const [originalRowSpacingValue, setOriginalRowSpacingValue] = useState(0);
  const [rowSpacingInputValid, setRowSpacingInputValid] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null); // 'columnAdd', 'columnMove', 'rowAdd', 'rowMove', 'rowSpacing', or null

  const [openTextDropdown, setOpenTextDropdown] = useState(null);
  const [openNewStyleDropdown, setOpenNewStyleDropdown] = useState(false);

  // Script tab state
  const [scriptInfo, setScriptInfo] = useState(null);

  const [layoutInfo, setLayoutInfo] = useState(null);

  // Delimiter toolbar state - using new ToolbarStateStore
  const [delimiterToolbarState, setDelimiterToolbarState] = useState(null);

  // New state variables for ToolbarStateStore integration
  const [textToolbarState, setTextToolbarState] = useState({
    isAvailable: false,
    chain: [],
    current: null,
    actions: {}
  });
  const [fontToolbarState, setFontToolbarState] = useState(null);
  const [arrayToolbarState, setArrayToolbarState] = useState(null);
  const [visibilityToolbarState, setVisibilityToolbarState] = useState(null);

  // Solve toolbar state
  const [solveToolbarState, setSolveToolbarState] = useState(null);
  const [customSolveInput, setCustomSolveInput] = useState('');


  useLayoutEffect(() => {
    wasFocusedRef.current = document.activeElement === inputRef.current;
  }, [editorStore.selection.range]);

  useEffect(() => {

    if (toolbarStateStore.activeCategory === 'Fonts') {
      // Use new ToolbarStateStore method
      const fontState = toolbarStateStore.getFontToolbarState();
      setFontToolbarState(fontState);

      // Extract font information for backward compatibility
      const { previewText, currentCommand } = fontState.metadata || {};
      setFontable(fontState.isAvailable);
      setFontText(previewText || 'x');
      setCurrentFontCommand(currentCommand);
    }

    // Array toolbar state using new ToolbarStateStore
    if (toolbarStateStore.activeCategory === 'Arrays') {
      // Use new ToolbarStateStore method
      const arrayState = toolbarStateStore.getArrayToolbarState();
      setArrayToolbarState(arrayState);

      // Extract spacing information for backward compatibility
      const spacings = arrayState.metadata?.spacings || [];
      const rowIndex = arrayState.metadata?.rowIndex || 0;

      if (spacings.length > rowIndex) {
        const spacing = spacings[rowIndex];
        if (spacing) {
          const value = spacing.number;
          if (Number.isFinite(value)) {
            setRowSpacingValue(value);
            setRowSpacingInputValue(value.toString());
          } else {
            setRowSpacingValue(0);
            setRowSpacingInputValue('0');
          }
        } else {
          setRowSpacingValue(0);
          setRowSpacingInputValue('0');
        }
      }

      if (!arrayState?.isAvailable) {
        setOpenDropdown(null);
      }

    }

    if (openDropdown && (openDropdown !== 'rowSpacing')) {
      setOpenDropdown(null);
    }

    if (toolbarStateStore.activeCategory === 'Text') {
      const state = toolbarStateStore.getTextToolbarState();
      setTextToolbarState(state);
    }

    if (toolbarStateStore.activeCategory === 'Advanced') {
      // Use new ToolbarStateStore method
      const scriptState = toolbarStateStore.getScriptToolbarState();
      setScriptInfo(scriptState.currentState);
      const layoutState = toolbarStateStore.getLayoutToolbarState();
      setLayoutInfo(layoutState.currentState);
    }

    // Update delimiter toolbar state using new ToolbarStateStore
    if (toolbarStateStore.activeCategory === 'Delimiters') {
      const delimiterState = toolbarStateStore.getDelimiterToolbarState();
      setDelimiterToolbarState(delimiterState);
    }

    // Update visibility toolbar state using new ToolbarStateStore
    if (toolbarStateStore.activeCategory === 'Visibility') {
      const visibilityState = toolbarStateStore.getVisibilityToolbarState();
      setVisibilityToolbarState(visibilityState);
    }

    // Update solve toolbar state using new ToolbarStateStore
    if (toolbarStateStore.activeCategory === 'Solve') {
      const solveState = toolbarStateStore.getSolveToolbarState();
      setSolveToolbarState(solveState);
    }

    setActiveCategory(toolbarStateStore.activeCategory);

  }, [editorStore.selection.range, toolbarStateStore.activeCategory]);


  useEffect(() => {
      rowSpacingInputRef.current?.focus();
  }, [rowSpacingInputValue])

  // Cleanup hover states when category changes away from Arrays
  useEffect(() => {
    if (toolbarStateStore.activeCategory !== 'Arrays') {
      toolbarStateStore.clearAllHoverStates();
    }
  }, [toolbarStateStore.activeCategory]);

  // Cleanup hover states when array context is lost
  useEffect(() => {
    if (!arrayToolbarState?.isAvailable) {
      toolbarStateStore.clearAllHoverStates();
    }
  }, [arrayToolbarState?.isAvailable]);

  // Cleanup hover states when component unmounts
  useEffect(() => {
    return () => {
      toolbarStateStore.clearAllHoverStates();
    };
  }, []);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // --- Handle array-related dropdowns ---
      if (openDropdown) {
        const dropdownContainer = document.querySelector('.dropdown-menu');
        const activeDropdownButton = document.querySelector('.dropdown-container button.active');

        if (dropdownContainer && activeDropdownButton) {
          const isClickInsideDropdown = dropdownContainer.contains(event.target);
          const isClickOnDropdownButton = activeDropdownButton.contains(event.target);

          if (!isClickInsideDropdown && !isClickOnDropdownButton) {
            setOpenDropdown(null);
          }
        }
      }

      // --- Handle text dropdowns (text style & add style) ---
      if (openTextDropdown !== null || openNewStyleDropdown) {
        const textDropdowns = document.querySelectorAll('.dropdown-menu');
        let clickedInside = false;

        textDropdowns.forEach((menu) => {
          if (menu.contains(event.target)) {
            clickedInside = true;
          }
        });

        const clickedOnFontButton = event.target.closest('.toolbar-button.selected-font.active');
        const clickedOnAddStyleButton = event.target.closest('.toolbar-button.add-style.active');

        if (!clickedInside && !clickedOnFontButton && !clickedOnAddStyleButton) {
          setOpenTextDropdown(null);
          setOpenNewStyleDropdown(false);
        }
      }
    };

    // Only attach listener if any dropdown is open
    if (openDropdown || openTextDropdown !== null || openNewStyleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, openTextDropdown, openNewStyleDropdown]);

  useEffect(() => {
    // changing selection should collapse the text dropdowns
    setOpenTextDropdown(null);
    setOpenNewStyleDropdown(false);
  }, [
    editorStore.selection.range
  ]);


  // Script tab functions - Connected to real EditorStore methods
  const toggleScriptMode = (newMode) => {
    if (scriptInfo && scriptInfo.element) {
      editorStore.setScriptMode(scriptInfo.element, newMode);
    }
  };

  const updateRowSpacing = (newValue) => {
    const arrayState = arrayToolbarState?.currentState;
    if (!arrayState) return;

    if (newValue === rowSpacingValue) {
      return;
    }

    editorStore.mutateArray(
      arrayState.table,
      arrayState.rowIndex,
      arrayState.cellIndex,
      "setRowSpacing",
      Number.isFinite(newValue) ? newValue : 0,
    );
  };

  const handleIncreaseRowSpacing = () => {
    const newValue = Math.round((rowSpacingValue + 0.25) * 100) / 100;
    setRowSpacingValue(newValue);
    setRowSpacingInputValue(newValue.toString());
    updateRowSpacing(newValue);
    setRowSpacingInputValid(true);
  };

  const handleDecreaseRowSpacing = () => {
    const newValue = Math.max(0, Math.round((rowSpacingValue - 0.25) * 100) / 100);
    setRowSpacingValue(newValue);
    setRowSpacingInputValue(newValue.toString());
    updateRowSpacing(newValue);
    setRowSpacingInputValid(true);
  };

  const handleRowSpacingInputChange = (e) => {
    const val = e.target.value;
    setRowSpacingInputValue(val);

    // Only validate the input, don't apply changes yet
    const num = parseFloat(val);
    const isValid = !isNaN(num) && num >= 0;
    setRowSpacingInputValid(isValid);
    rowSpacingInputRef.current?.focus();
  };

  const handleRowSpacingInputBlur = () => {
    const num = parseFloat(rowSpacingInputValue);
    if (!isNaN(num) && num >= 0) {
      // Apply the change
      setRowSpacingValue(num);
      setRowSpacingInputValue(num.toString());
      updateRowSpacing(num);
      setRowSpacingInputValid(true);
    } else {
      // Revert to the original value
      setRowSpacingInputValue(originalRowSpacingValue.toString());
      setRowSpacingValue(originalRowSpacingValue);
      setRowSpacingInputValid(true);
    }
  };

  const handleRowSpacingInputFocus = () => {
    // Store the original value when the input is focused
    setOriginalRowSpacingValue(rowSpacingValue);
  };

  const handleRowSpacingInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      rowSpacingInputRef.current?.blur();
    }
  };

  const handleExportPng = (pxPerEm, download) => {
    setOpenDropdown(null);
    editorStore.downloadImage(pxPerEm, download);
  }

  const handleCopyLatex = () => {
    editorStore.copyFullExpression();
  };

  const handleApplyFont = (latexWithFont) => {
    const range = fontToolbarState?.currentState?.range;
    mathStore.insertSymbol(latexWithFont, range);
  };

  const renderFontToolbar = () => {

    if (!fontable) {
      return (
        <div className="toolbar-row">
          <span className="toolbar-empty">No character detected</span>
        </div>
      );
    }

    return (
      <div className="toolbar-row">
        {FONT_COMMAND_DEFINITIONS.map(({ command, font }) => {

          const type = fontToolbarState?.currentState?.type;

          if (type === "LOWER") {
            if (!VALID_LOWER_FONTS.includes(command)) return null;
          } else if (type === "NUMBER") {
            if (!VALID_NUMBER_FONTS.includes(command)) return null;
          } else if (type === "OTHER") {
            if (!VALID_OTHER_FONTS.includes(command)) return null;
          }

          const latex = `${command}{${fontText}}`;
          const isActive = command === currentFontCommand;
          const label = FONT_COMMAND_LABELS[command];

          return (
            <button
              key={command}
              onClick={() => {
                if (!isActive) {
                  handleApplyFont(latex);
                }
              }}
              className={`toolbar-button ${isActive ? 'active' : ''}`}
              disabled={!fontable}
            >
              <span
                className="preview"
                dangerouslySetInnerHTML={renderLatex(latex)}
              />
              <span className="label">{label}</span>
            </button>
          );
        })}
      </div>
  )};

  const IMAGE_EXPORT_PRESETS = [
    { pxPerEm: 16, label: "16 px/em" },
    { pxPerEm: 32, label: "32 px/em" },
    { pxPerEm: 48, label: "48 px/em" },
  ];

  const renderHomeToolbar = () => (
    <div className="toolbar-row home">
      <button
        className={`toolbar-button`}
        onClick={handleCopyLatex}
        disabled={!mathStore.expression}
        title="Copy Full Expression"
      >
        <IconCopy size={20} />
      </button>

      <div className="dropdown-container">
        <button
          className={`toolbar-button ${openDropdown === 'image' ? 'active' : ''}`}
          onClick={() =>
            setOpenDropdown(openDropdown === 'image' ? null : 'image')
          }
          title="Download PNG"
        >
          <IconPhoto size={20} />
        </button>

        {openDropdown === 'image' && (
          <div className="dropdown-menu">
            <span className="dropdown-title">Export PNG</span>

              {IMAGE_EXPORT_PRESETS.map((opt) => (
                <div key={opt.pxPerEm} className="dropdown-item two-actions">
                  <div className="dropdown-item-label">{opt.label}</div>

                  <div className="actions">
                    {/* DOWNLOAD */}
                    <button
                      className="action-button"
                      title="Download PNG"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPng(opt.pxPerEm, true);
                      }}
                    >
                      <IconDownload size={16} />
                    </button>

                    {/* COPY */}
                    <button
                      className="action-button"
                      title="Copy PNG to clipboard"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportPng(opt.pxPerEm, false);
                      }}
                    >
                      <IconCopy size={16} />
                    </button>
                  </div>
                </div>
              ))}

          </div>
        )}
      </div>

      {!editorStore.hasSeenSmartMenuTip && (
        <div className="smart-menu-tip">
          <em>Tip: Press <kbd>Tab</kbd> to open the Smart Menu</em>
        </div>
      )}

    </div>
  );

  const renderHideToolbar = () => {
    const phantomInfo = visibilityToolbarState?.metadata?.phantomInfo || toolbarStateStore.determinePhantomState();
    const currentHideMode = phantomInfo?.type || 'none';

    // Get action capabilities from ToolbarStateStore
    const canCreate = visibilityToolbarState?.actions?.canCreate || false;
    const canModify = visibilityToolbarState?.actions?.canModify || false;
    const isAvailable = visibilityToolbarState?.isAvailable || false;

    const hideOptions = [
      { label: 'Visible', type: 'none', tooltip: 'Show content normally' },
      { label: 'Invisible', type: 'phantom', tooltip: 'Hide everything, keep space' },
      { label: 'No Height', type: 'hphantom', tooltip: 'Hide height only' },
      { label: 'No Width', type: 'vphantom', tooltip: 'Hide width only' },
    ];

    const handleToggleHide = (newType) => {
      const expr = mathStore.expression;

      if (!phantomInfo) return;
      const { commandRange, argumentRange } = phantomInfo;
      if (!argumentRange) return;
      let fullRange = {start: argumentRange.start, end: argumentRange.end}
      if (commandRange) {
        fullRange.start = commandRange.start;
      }

      // If already this type, do nothing
      if (phantomInfo.type === newType) return;

      if (newType === 'none') {
        // Remove surrounding braces from phantom argument
        const raw = expr.slice(argumentRange.start, argumentRange.end);
        const unwrapped = raw.replace(/^\{/, '').replace(/\}$/, '');
        mathStore.insertSymbol(unwrapped, fullRange);
        return;
      }

      const content = expr.slice(argumentRange.start, argumentRange.end)
      const wrapped = wrapWithCurlyBraces(content);

      const tex = `\\${newType}${wrapped}`;

      mathStore.insertSymbol(tex, fullRange);
    };

    return (
      <div className="toolbar-row hide-toggle-group">
        {hideOptions.map(({ label, type, tooltip }) => (
          <button
            key={type}
            onClick={() => handleToggleHide(type)}
            className={`toolbar-button ${currentHideMode === type ? 'active' : ''}`}
            disabled={!(canCreate || canModify)}
            title={tooltip}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  const Dropdown = ({ className, id, icon, title, options, disabled, customDropdown }) => {
    const isOpen = openDropdown === id;

    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdown(isOpen ? null : id);
    };

    return (
      <div className="dropdown-container">
        <button
          className={`toolbar-button ${isOpen ? 'active' : ''} ${className ? className : ''}`}
          onClick={handleToggle}
          disabled={disabled}
          title={title}
        >
          {icon}
        </button>

        {isOpen && (
          <div className={`dropdown-menu ${id === 'rowSpacing' ? 'dropdown-menu-left' : ''}`}>
            {customDropdown ? (
              customDropdown
            ) : (
              options.map((option) => (
                <button
                  key={option.label}
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    option.action();
                    setOpenDropdown(null);
                  }}
                  title={option.tooltip || option.label}
                >
                  {option.icon && <span className="dropdown-item-icon">{option.icon}</span>}
                  <span className="dropdown-item-label">{option.label}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  const renderArrayToolbar = () => {
    // Use new ToolbarStateStore instead of direct EditorStore call
    const arrayState = arrayToolbarState?.currentState;
    const columnAlignment = arrayState?.alignment || 'center';
    const canAlign = arrayState?.canAlign !== false;

    const {
      table,
      rowIndex,
      cellIndex
    } = arrayState || {};

    const inArray = Boolean(arrayToolbarState?.isAvailable);

    const alignmentIcons = {
      left: <IconAlignLeft size={20} />,
      center: <IconAlignCenter size={20} />,
      right: <IconAlignRight size={20} />
    };

    const currentAlignIcon = alignmentIcons[columnAlignment] || alignmentIcons.center;

    const alignmentOptions = [
      {
        label: 'Left',
        icon: <IconAlignLeft size={16} />,
        tooltip: 'Align left',
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "setColumnAlign", "l");
        },
      },
      {
        label: 'Center',
        icon: <IconAlignCenter size={16} />,
        tooltip: 'Align center',
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "setColumnAlign", "c");
        },
      },
      {
        label: 'Right',
        icon: <IconAlignRight size={16} />,
        tooltip: 'Align right',
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "setColumnAlign", "r");
        },
      },
    ];

    const columnAddOptions = [
      {
        label: "Add Left",
        icon: <IconArrowLeft size={16} />,
        tooltip: "Add column to the left",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "createColumnLeft");
        }
      },
      {
        label: "Add Right",
        icon: <IconArrowRight size={16} />,
        tooltip: "Add column to the right",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "createColumnRight");
        }
      }
    ];

    const columnMoveOptions = [
      {
        label: "Move Left",
        icon: <IconArrowLeft size={16} />,
        tooltip: "Move column left",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "moveColumnLeft");
        }
      },
      {
        label: "Move Right",
        icon: <IconArrowRight size={16} />,
        tooltip: "Move column right",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "moveColumnRight");
        }
      }
    ];

    const rowAddOptions = [
      {
        label: "Add Above",
        icon: <IconArrowUp size={16} />,
        tooltip: "Add row above",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "createRowAbove");
        }
      },
      {
        label: "Add Below",
        icon: <IconArrowDown size={16} />,
        tooltip: "Add row below",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "createRowBelow");
        }
      }
    ];

    const rowMoveOptions = [
      {
        label: "Move Up",
        icon: <IconArrowUp size={16} />,
        tooltip: "Move row up",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "moveRowUp");
        }
      },
      {
        label: "Move Down",
        icon: <IconArrowDown size={16} />,
        tooltip: "Move row down",
        action: () => {
          editorStore.mutateArray(table, rowIndex, cellIndex, "moveRowDown");
        }
      }
    ];

    const handleRemoveColumn = () => {
      editorStore.mutateArray(table, rowIndex, cellIndex, "removeColumn");
    };

    const handleRemoveRow = () => {
      editorStore.mutateArray(table, rowIndex, cellIndex, "removeRow");
    };

    return (
      <div className="toolbar-row array-toolbar">
        <div className="array-section">
          <span className="toolbar-label">Column</span>
          <Dropdown
            id="columnAdd"
            icon={<IconPlus size={20} />}
            options={columnAddOptions}
            disabled={!inArray}
          />

          <Dropdown
            id="columnMove"
            icon={<IconArrowsMove size={20} />}
            options={columnMoveOptions}
            disabled={!inArray}
          />

          <button
            className="toolbar-button"
            onClick={handleRemoveColumn}
            onMouseEnter={() => toolbarStateStore.setHoverState('columnDelete', true)}
            onMouseLeave={() => toolbarStateStore.setHoverState('columnDelete', false)}
            disabled={!inArray}
          >
            <IconTrash size={20} />
          </button>

          <Dropdown
            id="columnAlignment"
            icon={currentAlignIcon}
            options={alignmentOptions}
            disabled={!inArray || !canAlign}
            title={!canAlign ? "Alignment not available for small matrices" : "Column alignment"}
          />
        </div>

        <div className="separator" />

        <div className="array-section">
          <span className="toolbar-label">Row</span>
          <Dropdown
            id="rowAdd"
            icon={<IconPlus size={20} />}
            options={rowAddOptions}
            disabled={!inArray}
          />

          <Dropdown
            id="rowMove"
            icon={<IconArrowsMove size={20} />}
            options={rowMoveOptions}
            disabled={!inArray}
          />

          <button
            className="toolbar-button"
            onClick={handleRemoveRow}
            onMouseEnter={() => toolbarStateStore.setHoverState('rowDelete', true)}
            onMouseLeave={() => toolbarStateStore.setHoverState('rowDelete', false)}
            disabled={!inArray}
          >
            <IconTrash size={20} />
          </button>
          <Dropdown
            className={!!rowSpacingValue && "has-value"}
            id="rowSpacing"
            icon={<IconLineHeight size={20} />}
            title="Row spacing"
            options={[]}
            disabled={!inArray}
            customDropdown={
              <div className="row-spacing-dropdown">
                <span className="dropdown-title">Row Gap</span>
                <div className="kern-adjuster">
                  <button
                    onClick={handleDecreaseRowSpacing}
                    className="kern-step">
                      –
                  </button>
                  <div className={`kern-input-group ${
                    rowSpacingInputValue !== rowSpacingValue.toString()
                      ? rowSpacingInputValid
                        ? 'valid-input'
                        : 'invalid-input'
                      : ''
                  }`}>
                    <input
                      ref={rowSpacingInputRef}
                      type="text"
                      value={rowSpacingInputValue}
                      onChange={handleRowSpacingInputChange}
                      onFocus={handleRowSpacingInputFocus}
                      onBlur={handleRowSpacingInputBlur}
                      onKeyDown={handleRowSpacingInputKeyDown}
                      className="kern-input row-spacing-input"
                    />
                    <span className="kern-unit">em</span>
                  </div>
                  <button
                    onClick={handleIncreaseRowSpacing}
                    className="kern-step">
                      +
                  </button>
                </div>
                {rowSpacingInputValue !== rowSpacingValue.toString() && (
                  <span className="input-hint">Press Enter to apply</span>
                )}
              </div>
            }
          />
        </div>
      </div>
    );
  };

  const renderDelimiterSizeToolbar = () => {
    if (!delimiterToolbarState || !delimiterToolbarState.isAvailable) {
      return (
        <div className="toolbar-row delimiter-toolbar">
          <span className="toolbar-empty">No delimiter detected</span>
        </div>
      );
    }

    const { currentState, actions, metadata } = delimiterToolbarState;
    const currentCommand = currentState?.modifier || '';
    const autoCommands = ["\\left", "\\middle", "\\right"];
    const isDelimiterMode = currentCommand !== '\\mathrel';

    const handleToggleDelimiterMode = () => {
      if (!currentState || !currentState.delimiter || !currentState.range) return;

      const newCommand = isDelimiterMode ? '\\mathrel' : '';
      const delimiter = currentState.delimiter;
      const newTex = newCommand ? `\\mathrel{${delimiter}}` : delimiter;
      mathStore.insertSymbol(newTex, currentState.range);
    };

    const handleSetSize = (newCommand) => {
      if (!currentState || !currentState.delimiter || !currentState.range) return;

      if ((currentState.modifier || '') === (newCommand || '')) return;

      const newTex = newCommand ? `${newCommand}${currentState.delimiter}` : currentState.delimiter;
      mathStore.insertSymbol(newTex, currentState.range);
    };

    const handleGroupSelection = () => {
      editorStore.tryCommitDelimGroup();
    };

    const handleDissolveGroup = () => {
      editorStore.dissolveCurrentGroup();
    };

    // Hover handlers for visual feedback
    const handleDissolveHover = () => {
      if (metadata.groupElement) {
        toolbarStateStore.highlightDelimiterGroup(metadata.groupElement);
      }
    };

    const handleDissolveLeave = () => {
      toolbarStateStore.clearDelimiterHighlight();
    };

    // Target highlighting for size buttons (including Auto)
    const handleSizeHover = () => {
      if (currentState?.element) {
        toolbarStateStore.highlightTargetDelimiter(currentState.element);
      }
    };

    const handleSizeLeave = () => {
      toolbarStateStore.clearTargetHighlight();
    };

    return (
      <div className="toolbar-row delim-toolbar">

        {actions.canModifySize && (
          <>
            {/* Delimiter Mode Toggle */}
            <button
              className={`toolbar-button toggle-mode ${isDelimiterMode ? 'active' : ''}`}
              onClick={handleToggleDelimiterMode}
              onMouseEnter={handleSizeHover}
              onMouseLeave={handleSizeLeave}
              title={isDelimiterMode ? "Delimiter mode (click to disable)" : "Symbol mode (click to enable delimiter)"}
              disabled={!actions.canModifySize}
            >
              {isDelimiterMode ? "Delimiter" : "Symbol Mode"}
            </button>

            {/* Size Controls - only show when in delimiter mode */}
            {isDelimiterMode && (
              <>
                <div className="separator" />
                <span className="toolbar-label">Size</span>
                {DELIMITER_SIZE_OPTIONS.map(({ label, command }) => (
                  <button
                    key={label}
                    className={`toolbar-button ${currentCommand === command ? 'active' : ''}`}
                    onClick={() => handleSetSize(command)}
                    onMouseEnter={handleSizeHover}
                    onMouseLeave={handleSizeLeave}
                    title={`Set to ${label}`}
                    disabled={!actions.canModifySize}
                  >
                    {label}
                  </button>
                ))}

                <button
                  className={`toolbar-button ${autoCommands.includes(currentCommand) ? 'active' : ''}`}
                  onClick={() => handleSetSize("\\middle")}
                  onMouseEnter={handleSizeHover}
                  onMouseLeave={handleSizeLeave}
                  title={!actions.canModifyAuto ? "Needs to be in a delimited group" : "Set to auto-size"}
                  disabled={!actions.canModifyAuto}
                >
                  Auto
                </button>
              </>
            )}
          </>
        )}

        {actions.canGroupSelection && (
          <>
            <div className="separator"/>
            <button
              className="toolbar-button"
              onClick={handleGroupSelection}
              title="Group selected delimiters"
            >
              Group Selection
            </button>
          </>
        )}

        {/* Dissolve button with hover highlighting */}
        {actions.canDissolve && (
          <>
            <div className="separator"/>
            <button
              className="toolbar-button dissolve-button"
              onClick={handleDissolveGroup}
              onMouseEnter={handleDissolveHover}
              onMouseLeave={handleDissolveLeave}
              title="Dissolve delimiter group"
            >
              <IconLinkOff size={20} />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderTextToolbar = () => {

    const handleInsertText = (command = "\\text") => {
      mathStore.insertSymbol(`${command}{Ꞩ1}`, null, { noSurroundingWhitespace: true });
    };

    const handleChangeTextFormat = (range, newCommand) => {
      mathStore.insertSymbol(newCommand, range, { noSurroundingWhitespace: true, keepCaret: true });
    };

    const handleDissolveTextBlock = (range) => {
      editorStore.dissolveTextBlock(range);
    };

    const handleAddStyle = (command = "\\textit") => {
      mathStore.insertSymbol(`${command}{Ꞩ1}`, null, { noSurroundingWhitespace: true });
    };

    if (!textToolbarState.isAvailable) {
      return (
        <div className="toolbar-row">
          <button
            className="toolbar-button text-add-button"
            onClick={() => handleInsertText()}
          >
            Add text block
          </button>
        </div>
      );
    }

    return (
      <div className="toolbar-row text-toolbar">
        {textToolbarState.chain.map((level, i) => {
          if (level.command === '\\text') {
            return null;
          }
          return (
            <div className="breadcrumb" key={`text-${i}`}>
              <div className="dropdown-container">
                <button
                  className={`toolbar-button selected-font ${
                    openTextDropdown === i ? 'active' : ''
                  }`}
                  onClick={() =>
                    setOpenTextDropdown(openTextDropdown === i ? null : i)
                  }
                  aria-expanded={openTextDropdown === i}
                >
                  {TEXT_COMMAND_OPTIONS.find(opt => opt.command === level.command)?.label || level.command}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`dropdown-icon ${openTextDropdown === i ? "open" : ""}`}
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {openTextDropdown === i && (
                  <div className="dropdown-menu">
                    {TEXT_COMMAND_OPTIONS.map(opt => (
                      <button
                        key={opt.command}
                        className={`dropdown-item ${(opt.command === level.command) ? 'active' : ''}`}
                        onClick={() => {
                          handleChangeTextFormat(level.range, opt.command);
                          setOpenTextDropdown(null);
                        }}
                      >
                        <span className="dropdown-item-label">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="toolbar-button dissolve"
                onClick={() => handleDissolveTextBlock(level.range)}
              >
                ×
              </button>

              {i < textToolbarState.chain.length && (
                <span className="arrow">→</span>
              )}
            </div>
        )})}
        <div className="dropdown-container">
          <button
            className="toolbar-button add-style"
            onClick={() => setOpenNewStyleDropdown(!openNewStyleDropdown)}
          >
            + Add style
          </button>
          {openNewStyleDropdown && (
            <div className="dropdown-menu">
              {TEXT_COMMAND_OPTIONS.map(opt => (
                <button
                  key={opt.command}
                  className="dropdown-item"
                  onClick={() => {
                    handleAddStyle(opt.command);
                    setOpenNewStyleDropdown(false);
                  }}
                >
                  <span className="dropdown-item-label">{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const modeOptions = [
    { mode: 'attached', label: 'Attached', description: 'Script positioning responds to preceding atom' },
    { mode: 'detached', label: 'Detached', description: 'Script positioning is fixed' }
  ];

  const renderScriptModeControl = () => {
    const { type, mode, element } = scriptInfo;

    let disable = false;
    if (mode === 'detached') {
      const pre = element.previousElementSibling;
      if (
        (ML.isType(element, ['msub', 'msubsup']) && ML.isType(pre, ['msub', 'msubsup'])) ||
        (ML.isType(element, ['msup', 'msubsup']) && ML.isType(pre, ['msup', 'msubsup']))
      ) {
        disable = true;
      }
    }

    const typeLabels = {
      subscript: 'Subscript',
      superscript: 'Superscript',
      subsuperscript: 'Sub & Superscript',
    };

    return (
      <div className="script-mode-inline">
        <span className="toolbar-label">
          {typeLabels[type]} mode
        </span>

        <div className="dropdown-container">
          <button
            className={`toolbar-button selected-script-mode ${
              openDropdown === 'scriptMode' ? 'active' : ''
            }`}
            disabled={disable}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === 'scriptMode' ? null : 'scriptMode');
            }}
            aria-expanded={openDropdown === 'scriptMode'}
          >
            {modeOptions.find(o => o.mode === mode)?.label}

            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`dropdown-icon ${openDropdown === 'scriptMode' ? 'open' : ''}`}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openDropdown === 'scriptMode' && (
            <div className="dropdown-menu">
              {modeOptions.map(({ mode: m, label, description }) => (
                <button
                  key={m}
                  className={`dropdown-item script-mode-item ${mode === m ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(null);
                    if (mode !== m) toggleScriptMode(m);
                  }}
                >
                  <span className="dropdown-item-label">{label}</span>
                  <span className="script-mode-item-sub">{description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleLayoutMode = (newType) => {
    const caret = editorStore.getCaretElement();
    const expr = mathStore.expression;

    if (layoutInfo) {
      const { layoutCommand, layoutRange } = layoutInfo;

      if (layoutCommand === newType) return;

      if (!newType) {
        mathStore.removeRange(layoutRange.start, layoutRange.end, { keepCaret: true });
      } else {
        mathStore.insertSymbol(newType, layoutRange, { keepCaret: !editorStore.hasSelection() });
      }

    } else if (editorStore.hasSelection()) {
      const range = { ...editorStore.selection.range };
      const content = expr.slice(range.start, range.end);
      mathStore.insertSymbol(`{${newType} ${content}}`, range);
    } else if (caret) {
      const mrowWithRange = ML.findAncestor(
        caret,
        el => ML.isType(el, "mrow") && ML.getRangeFromElement(el)
      );

      let pos;

      if (mrowWithRange?.classList?.contains("delimited-group")) {
        for (const child of ML.getMathMLChildren(mrowWithRange)) {
          const range = ML.getRangeFromElement(child);
          if (range) { pos = range.start; break; }
        }
      } else {
        const range = ML.getRangeFromElement(mrowWithRange);
        pos = range.start+1;
      }

      mathStore.insertSymbol(newType, { start: pos, end: pos }, { keepCaret: true });
    }
  };

  const renderLayoutModeControl = () => {
    const caret = editorStore.getCaretElement();
    if (ML.isRootMrow(caret?.parentElement)) return null;

    const mrowWithRange = caret
      ? ML.findAncestor(
          caret,
          el => ML.isType(el, "mrow") && ML.getRangeFromElement(el)
        )
      : null;

    const highlightElement = caret
      ? layoutInfo?.scopeElement ?? mrowWithRange
      : null;

    const currentOption =
      LAYOUT_MODE_OPTIONS.find(o => o.type === layoutInfo?.layoutCommand) || LAYOUT_MODE_OPTIONS[0];

    return (
      <div
        className="script-mode-inline"
        onMouseEnter={() => toolbarStateStore.highlightLayoutMode(highlightElement)}
        onMouseLeave={() => toolbarStateStore.clearLayoutModeHighlight()}
        >
        <span className="toolbar-label">Layout mode</span>

        <div className="dropdown-container">
          <button
            className={`toolbar-button selected-script-mode ${
              openDropdown === 'layoutMode' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenDropdown(openDropdown === 'layoutMode' ? null : 'layoutMode');
            }}
            aria-expanded={openDropdown === 'layoutMode'}
          >
            {currentOption.label}

            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`dropdown-icon ${openDropdown === 'layoutMode' ? 'open' : ''}`}
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openDropdown === 'layoutMode' && (
            <div className="dropdown-menu">
              {LAYOUT_MODE_OPTIONS.map(({ type, label, description }) => {
                const isActive = layoutInfo?.layoutCommand === type;

                return (
                  <button
                    key={label}
                    className={`dropdown-item script-mode-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(null);
                      toggleLayoutMode(type);
                    }}
                  >
                    <span className="dropdown-item-label">{label}</span>
                    <span className="script-mode-item-sub">{description}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdvancedToolbar = () => {
    return (
      <div className="toolbar-row script-toolbar">
        {renderLayoutModeControl()}
        <span className="separator"></span>
        {scriptInfo && renderScriptModeControl()}
      </div>
    );
  };

  const buildChatGPTUrl = (expression, customInput) => {
    const prompt = customInput.trim()
      ? `${expression} ${customInput}`
      : expression;
    return `https://chat.openai.com/?model=gpt-5&q=${encodeURIComponent(prompt)}`;
  };

  const buildWolframUrl = (expression, customInput) => {
    const query = customInput.trim()
      ? `${expression} ${customInput}`
      : expression;
    return `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`;
  };

  const renderSolveToolbar = () => (
    <div className="toolbar-row solve-toolbar">
      <div className="solve-input-section">
        <input
          type="text"
          value={customSolveInput}
          onChange={(e) => setCustomSolveInput(e.target.value)}
          placeholder="e.g., Solve for Y, Find the derivative, etc."
          className="solve-input"
          disabled={!solveToolbarState?.isAvailable}
        />
      </div>

      <div className="solve-buttons">
        <button
          className="toolbar-button solve-button chatgpt"
          onClick={() => {
            const url = buildChatGPTUrl(mathStore.expression, customSolveInput);
            window.open(url, '_blank');
          }}
          disabled={!solveToolbarState?.isAvailable}
          title="Solve with ChatGPT"
        >
          <OpenAI />
        </button>

        <button
          className="toolbar-button solve-button wolfram"
          onClick={() => {
            const url = buildWolframUrl(mathStore.expression, customSolveInput);
            window.open(url, '_blank');
          }}
          disabled={!solveToolbarState?.isAvailable}
          title="Solve with Wolfram Alpha"
        >
          <Wolfram />
        </button>
      </div>
    </div>
  );

  return (
    <div className="vieta-root math-toolbar-main">
      <div className="toolbar-tabs">
        {[
          { key: 'Fonts', label: 'Symbols', title: 'Math symbol fonts' },
          //{ key: 'Home', label: 'Home' },
          { key: 'Delimiters', label: 'Delimiters' },
          { key: 'Arrays', label: 'Arrays' },
          { key: 'Text', label: 'Text', title: 'Text formatting' },
          { key: 'Visibility', label: 'Visibility' },
          { key: 'Advanced', label: 'Advanced' },
          // { key: 'Solve', label: 'Solve' },
        ].map(({ key, label, title }) => {
          const isActive = activeCategory === key;
          const isDisabled = toolbarStateStore.isTabDisabled(key);
          const isHighlighted = toolbarStateStore.isTabHighlighted(key);
          const className = [
            'toolbar-tab',
            isActive && 'active',
            isDisabled && 'disabled',
            isHighlighted && !isActive && 'highlight'
          ].filter(Boolean).join(' ');

          return (
            <button
              key={key}
              className={className}
              onClick={() => !isDisabled && toolbarStateStore.setActiveCategory(key)}
              disabled={isDisabled}
              title={title}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeCategory === 'Home' && renderHomeToolbar()}
      {activeCategory === 'Fonts' && renderFontToolbar()}
      {activeCategory === 'Visibility' && renderHideToolbar()}
      {activeCategory === 'Delimiters' && renderDelimiterSizeToolbar()}
      {activeCategory === 'Arrays' && renderArrayToolbar()}
      {activeCategory === 'Text' && renderTextToolbar()}
      {activeCategory === 'Advanced' && renderAdvancedToolbar()}
      {/*activeCategory === 'Solve' && renderSolveToolbar()*/}
    </div>
  );
}

export default observer(MathToolbar);
