import React, { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useMathStore } from '@stores/StoreContext';
import { IconCopy, IconCheck } from '@tabler/icons-react';
import './LatexPreview.scss';

function LatexPreview() {
  const mathStore = useMathStore();
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(mathStore.expression).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }, [mathStore.expression]);

  return (
    <div className="latex-preview-container">
      <div className="latex-preview-header">
        <h3>LaTeX Code</h3>
        <button
          className={`copy-button ${copySuccess ? 'success' : ''}`}
          onClick={copyToClipboard}
          disabled={!mathStore.expression}
        >
          {copySuccess ? <IconCheck size={18} /> : <IconCopy size={18} />}
        </button>
      </div>
      <div className="latex-preview-content">
        {mathStore.expression ? (
          <pre className="latex-code">{mathStore.expression}</pre>
        ) : (
          <div className="latex-placeholder">
            LaTeX code will appear here
          </div>
        )}
      </div>
    </div>
  );
};

export default observer(LatexPreview);
