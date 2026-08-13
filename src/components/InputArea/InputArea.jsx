import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useMathStore, useEditorStore } from '@stores/StoreContext';
import { IconAlertTriangle, IconPlayerPlay } from '@tabler/icons-react';
import lme from 'lme';
import './InputArea.scss';

function InputArea() {
  const [errors, setErrors] = useState([]);
  const [localValue, setLocalValue] = useState('');
  const mathStore = useMathStore();
  const editorStore = useEditorStore();
  const textareaRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setLocalValue(mathStore.expression);
    setErrors([]);
    setIsEditing(false);
  }, [mathStore.expression]);

  const handleChange = useCallback((event) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
  }, []);

  const handleCompile = useCallback(() => {
    setErrors([]);
    editorStore.removeCaret();
    editorStore.clearSelection();
    try {
      const checkErrors = lme.checkErrors(localValue);
      if (checkErrors && checkErrors.length > 0) {
        setErrors(checkErrors);
        return;
      }

      setErrors([]);
      const expanded = lme.expandString(localValue);
      editorStore.updateExpression(expanded);
      editorStore.setSelection(
        { start: expanded.length, end: expanded.length }
      );
      setIsEditing(false);
    } catch (error) {
      setErrors([{ message: error.message, start: 0, end: localValue.length }]);
    }
  }, [localValue, mathStore]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);

    const { range } = editorStore.selection;
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.selectionStart = range.start;
      textarea.selectionEnd = range.end;
    }
  }, [editorStore.selection]);

  const handleBlur = useCallback(() => {
    if (localValue === mathStore.expression) {
      setIsEditing(false);
    }
  });

  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (textarea && (localValue === mathStore.expression)) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      editorStore.setSelection({ start, end });
      editorStore.setCaretBasedOnPosition();
    } else {
      editorStore.removeCaret();
    }
  };

  const handleViewClick = useCallback(() => {
    setIsEditing(true);
    editorStore.setCaretVisible(false);
    editorStore.clearActiveClasses();
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    });
  }, []);

  const renderHighlightedText = () => {
    const hasUncompiledChanges = localValue !== mathStore.expression;
    const textToRender = hasUncompiledChanges ? localValue : mathStore.expression;
    const { range } = editorStore.selection;
    const { start, end } = range;

    return start === end ? (
      <>
        {textToRender.slice(0, start)}
        <span className="caret-indicator"></span>
        {textToRender.slice(start)}
      </>
    ) : (
      <>
        {textToRender.slice(0, start)}
        <span className="highlighted">{textToRender.slice(start, end)}</span>
        {textToRender.slice(end)}
      </>
    );
  };

  return (
    <div className="input-area-container">
      <div className="input-content">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="input-area"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onSelect={handleSelect}
            onFocus={handleFocus}
            placeholder="Enter LaTeX math expression..."
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        ) : (
          <div
            className="input-area-view"
            onClick={handleViewClick}
            title="Click to start editing"
          >
            {renderHighlightedText()}
          </div>
        )}
      </div>
      {(localValue !== (mathStore.expression) || errors.length > 0) && isEditing && (
        <>
          <button className="compile-button" onClick={handleCompile}>
            <IconPlayerPlay size={18} /> Compile
          </button>
          {errors.length > 0 && (
            <div className="error-container">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  <span className="error-icon"><IconAlertTriangle size={14} /></span>
                  {error.message}
                  {error.start !== undefined && (
                    <span className="error-location">
                      (position: {error.start}-{error.end})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default observer(InputArea);
