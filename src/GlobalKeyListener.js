import { useEffect, useRef } from "react";
import {
    useEditorStore,
    useUIStore,
    useMathStore,
    useSmartMenuStore,
    useActionStore,
    useToolbarStateStore,
} from "@stores/StoreContext";
import { MMLInspector as ML } from "@utils/MMLInspector";
import { TeXProcessor as TP } from '@utils/TeXProcessor';
import { isModernWebKit } from '@utils/deviceCapabilities';

const GlobalKeyListener = ({ editorElement }) => {
    const editorStore = useEditorStore();
    const mathStore = useMathStore();
    const uiStore = useUIStore();
    const smartMenuStore = useSmartMenuStore();
    const actionStore = useActionStore();
    const toolbarStateStore = useToolbarStateStore();

    const SHORTCUTS = () => ({
        "/": { basic: "\\frac{Ꞩ1}{Ꞩ2}", id: "frac" },
        "_": { basic: "Ꞩ0_{Ꞩ1}", id: "sub" },
        "^": { basic: "Ꞩ0^{Ꞩ1}", id: "sup" },
        "{": { basic: "\\{", selection: "\\{Ꞩ1\\}" },
        "(": { basic: "(", selection: "(Ꞩ1)" },
        "[": { basic: "[", selection: "[Ꞩ1]" },
        "|": { basic: "|", selection: "|Ꞩ1|" },

        "}": { basic: "\\}"},

        "*": { basic: "\\cdot" },

        "#": { basic: "\\#" },
        "%": { basic: "\\%" },
        "&": { basic: "\\&" },
    });

    const beforeInputAllowedRef = useRef(true);

    const canAcceptInputRef = useRef(true);
    const gateTimerRef = useRef(null);
    const disableInputTemporarily = (duration = 25) => {
    canAcceptInputRef.current = false;
        if (gateTimerRef.current) clearTimeout(gateTimerRef.current);
        gateTimerRef.current = setTimeout(() => {
            canAcceptInputRef.current = true;
            gateTimerRef.current = null;
        }, duration);
    };

    const enable = () => {
        return editorStore.hasCaret() || editorStore.hasVisualSelection();
    }

    useEffect(() => {

        const el = editorStore.editorRef;
        if (!el) return;

        const processSingleCharInput = (char, originalEvent, source = "beforeinput") => {
            if (!char || char.length !== 1) return;

            // Don’t process if modals, menus mode are active
            if (smartMenuStore.isOpen) return;

            if (!canAcceptInputRef.current) return;
            disableInputTemporarily();

            // remove circumflex
            const decomp = char.normalize('NFD');
            if (/[\u0302]/.test(decomp)) {
                char = decomp.replace(/[\u0302]/g, '');
            }
            // ² → 2.
            char = char.normalize("NFKC");

            const isInText = TP.getEnclosingTextCommand(
                mathStore.expression,
                editorStore.selection.range.start - 1
            );

            editorStore.setFocus();

            // Backslash — just prevent
            if (char === "\\") {
                originalEvent?.preventDefault?.();
                originalEvent?.stopPropagation?.();
                return;
            }

            // Space
            if (char === " ") {
                if (!isInText) {
                    editorStore.handleSpace();
                } else {
                    editorStore.insertCharacter(" ", null, { noSurroundingWhitespace: true });
                }
                return;
            }

            // Caret → superscript
            if (!isInText && ["^", "\u02C6", "\u0302"].includes(char)) {
                const texObj = SHORTCUTS()["^"];
                const hasSel = editorStore.hasVisualSelection && editorStore.hasVisualSelection();
                const symbol = {
                    latex: hasSel ? (texObj.selection || texObj.basic) : texObj.basic,
                    id: texObj.id
                };
                const ctx = editorStore.getSymbolContext(symbol, true);
                editorStore.insertCharacter(ctx.modifiedTex || symbol.latex, ctx.injectionRange, ctx.options);
                return;
            }

            // Mapped shortcuts
            const texObj = !isInText ? SHORTCUTS()?.[char] : null;
            if (!isInText && texObj) {
                const hasSel = editorStore.hasVisualSelection && editorStore.hasVisualSelection();
                const symbol = {
                    latex: hasSel ? (texObj.selection || texObj.basic) : texObj.basic,
                    id: texObj.id
                };
                const ctx = editorStore.getSymbolContext(symbol, true);
                editorStore.insertCharacter(ctx.modifiedTex || symbol.latex, ctx.injectionRange, ctx.options);
                return;
            }

            // Default case
            if (isInText) {
                editorStore.insertCharacter(char, null, { noSurroundingWhitespace: true });
            } else {
                editorStore.insertCharacter(char);
            }
        };

        const handleBeforeInput = (event) => {
            // Guard: Only handle if THIS editor is focused
            if (!enable()) return;

            event.preventDefault();
            event.stopPropagation();

            if (!canAcceptInputRef.current) return;

            let data = event.data;

            if (!beforeInputAllowedRef.current) {
                if (data !== "^") {
                    beforeInputAllowedRef.current = true;
                }
                // should this return really be here? should
                // we not pass through it if we set
                // beforeInputAllowedRef.current = true;
                return;
            }

            if (event.inputType === "insertCompositionText") {
                const el = editorStore.editorRef;
                const sink = uiStore.appRootRef?.querySelector('#ime-focus-sink');
                el.setAttribute('contenteditable', 'false');
                setTimeout(() => {
                    if (sink) sink.focus();
                    el.setAttribute('contenteditable', 'true');
                    el.focus();
                    editorStore.setCaretBasedOnPosition();
                }, 0);
                if (event.data !== "^") return;
            }

            if (event.inputType === "insertFromComposition") return;
            if (data?.length !== 1) return;

            processSingleCharInput(data, event, "beforeinput");
        };

        const handleKeyPress = (event) => {
            if (beforeInputAllowedRef.current) return;

            if (!enable()) return;

            let char = event.key;
            if (char === "^") return;

            event.preventDefault?.();
            event.stopPropagation?.();

            if (char?.length === 1) {
                processSingleCharInput(char, event, "keypress");
            }
        };

        const suppress = (e) => {
            e.preventDefault()
        }

        el.addEventListener("beforeinput", handleBeforeInput);
        el.addEventListener("keypress", handleKeyPress);

        // We probably don't even needs these
        el.addEventListener("input", suppress);
        el.addEventListener("compositionstart", suppress);
        el.addEventListener("compositionupdate", suppress);
        el.addEventListener("compositionend", suppress);

        return () => {
            el.removeEventListener("beforeinput", handleBeforeInput);
            el.removeEventListener("keypress", handleKeyPress);

            el.removeEventListener("input", suppress);
            el.removeEventListener("compositionstart", suppress);
            el.removeEventListener("compositionupdate", suppress);
            el.removeEventListener("compositionend", suppress);

        };

    }, [editorElement]);

    useEffect(() => {

        const handleSmartMenuConfirm = () => {
            const selectedResult = smartMenuStore.getSelectedResult();

            if (!selectedResult) {
                smartMenuStore.close();
                return;
            }

            if (selectedResult.type === "compound") {
                const subAction =
                    selectedResult.subActions[smartMenuStore.selectedSubIndex];

                if (!subAction) return;

                if (typeof subAction.execute === "function") {
                    subAction.execute();
                } else if (subAction.latex) {
                    editorStore.insertSmartMenuResult(subAction);
                }

                smartMenuStore.close();
            } else {
                editorStore.insertSmartMenuResult(selectedResult);
            }
        };

        const handleKeyDown = (event) => {

            if (!(event.key.length > 1 || event.ctrlKey || event.metaKey)) {
                // Allow "^" + Backspace combo through
                if (!(event.key === "^" && event.code === "Backspace")) {
                    return;
                }
            }

            if (smartMenuStore.isOpen) {
                switch (event.key) {
                    case "ArrowDown":
                        event.preventDefault();
                        smartMenuStore.selectNext();
                        return;
                    case "ArrowUp":
                        event.preventDefault();
                        smartMenuStore.selectPrevious();
                        return;
                    case "ArrowLeft":
                    case "ArrowRight": {
                        const selectedResult = smartMenuStore.getSelectedResult();
                        const hasQuery = smartMenuStore.searchQuery.trim().length > 0;
                        if (!hasQuery && selectedResult?.subActions) {
                            event.preventDefault();
                            if (event.key === "ArrowLeft") {
                                smartMenuStore.selectPreviousSubAction();
                            } else {
                                smartMenuStore.selectNextSubAction();
                            }
                        }
                        return;
                    }
                    case "Enter":
                    case "Tab":
                        event.preventDefault();
                        handleSmartMenuConfirm();
                        return;
                    case "Escape":
                    case "F6":
                        event.preventDefault();
                        event.stopPropagation();
                        smartMenuStore.close();
                        return;
                }
            }

            if (!enable()) return;

            if (!canAcceptInputRef.current) return;
            if (event.repeat) {
                disableInputTemporarily();
            } else {
                canAcceptInputRef.current = true;
            }

            // Only handle key events when visual editor is focused
            if (uiStore.isFormElementFocused() || (!editorStore.hasCaret() && !editorStore.hasVisualSelection() )) return;
            if (editorStore.isEditorDisabled) return;

            // We need to stop supporting zoom
            /*
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (!isModernWebKit()) {
                    editorStore.toggleAutoZoom();
                }
                return;
            }
            */

            // Handle select all shortcut (Ctrl+A / Cmd+A)
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                editorStore.setFocus();
                editorStore.handleProgressiveSelectAll();
                return;
            }

            if (event.key === "^" && event.code === "Backspace") {
                editorStore.setFocus();
                editorStore.handleBackspace();
                return;
            }

            // A possible solution for Windows
            const isAltGr = (e) => e.getModifierState && e.getModifierState("AltGraph");
            const noSysMods = (e) => !e.ctrlKey && !e.metaKey;
            const isCaretDeadKey = (e) => {
                if (!noSysMods(e)) return false;
                    const key = e.key.toLowerCase();
                    if (!["dead", "^^"].includes(key)) return false;
                switch (e.code) {
                    case "Digit6":       // US-Intl Shift+6
                    return e.shiftKey && !isAltGr(e);
                    case "BracketRight": // Nordic Shift+BracketRight (or AltGr variant)
                    return e.shiftKey && !isAltGr(e);
                    case "Backquote":    // German unshifted Backquote
                    return !e.shiftKey && !isAltGr(e);
                    case "BracketLeft":  // French/Belgian unshifted BracketLeft
                    return !e.shiftKey && !isAltGr(e);
                    default:
                    return false;
                }
            }
            if (isCaretDeadKey(event)) {

                beforeInputAllowedRef.current = false;

                const isInText = TP.getEnclosingTextCommand(mathStore.expression, editorStore.selection.range.start-1);
                if (!isInText) {
                    const texObj = SHORTCUTS()["^"];
                    const hasSel = editorStore.hasVisualSelection && editorStore.hasVisualSelection();
                    const symbol = {
                        latex: hasSel ? (texObj.selection || texObj.basic) : texObj.basic,
                        id: texObj.id
                    };
                    const ctx = editorStore.getSymbolContext(symbol, true);
                    editorStore.insertCharacter(ctx.modifiedTex || symbol.latex, ctx.injectionRange, ctx.options);
                }

                const el = editorStore.editorRef;
                const sink = uiStore.appRootRef?.querySelector('#ime-focus-sink');

                sink.focus();
                setTimeout(() => {
                    el.focus();
                    editorStore.setCaretBasedOnPosition();
                }, 0);

                return;
            }

            switch (event.key) {
                case "Backspace":
                    editorStore.setFocus();
                    editorStore.handleBackspace(true, (event.ctrlKey || event.metaKey));
                    break;

                case "Delete":
                    editorStore.setFocus();
                    editorStore.handleDelete(true, (event.ctrlKey || event.metaKey));
                    break;

                case "Enter":
                    editorStore.setFocus();
                    editorStore.handleEnter();
                    break;

                case "Escape":
                    editorStore.setFocus();
                    if (smartMenuStore.isOpen) {
                        event.preventDefault();
                        smartMenuStore.close();
                    } else {
                        editorStore.handleEscape();
                    }
                    break;

                case "Tab":
                    // Open Smart Menu when Tab is pressed
                    if (!smartMenuStore.isOpen && (editorStore.hasCaret() || editorStore.hasVisualSelection())) {
                        event.preventDefault();
                        event.stopPropagation();
                        editorStore.setFocus();

                        // Get cursor position for menu positioning
                        let anchor = editorStore.getCaretElement();

                        if (!anchor) {
                            const visualElements = editorStore.getOrderedVisualElements();
                            anchor = visualElements.reduce((rightMost, el) => {
                                if (!rightMost) return el;
                                const elRect = el.getBoundingClientRect();
                                const rightMostRect = rightMost.getBoundingClientRect();
                                return elRect.right > rightMostRect.right ? el : rightMost;
                            }, null);
                        }

                        if (anchor) {
                            const rect = anchor.getBoundingClientRect();
                            const position = {
                                x: rect.right,
                                y: rect.bottom
                            };
                            smartMenuStore.open(position);
                        }
                    }
                    break;

                case "F6":
                    // Close Smart Menu and remove caret (as per WCAG requirements)
                    event.preventDefault();
                    if (smartMenuStore.isOpen) {
                        smartMenuStore.close();
                    }
                    editorStore.removeCaret();
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    editorStore.setFocus();
                    if (editorStore.hasVisualSelection() && !event.shiftKey) {
                        editorStore.updatePosition();
                    }
                    editorStore.handleUp();
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    editorStore.setFocus();
                    if (editorStore.hasVisualSelection() && !event.shiftKey) {
                        editorStore.updatePosition();
                    }
                    editorStore.handleDown();
                    break;

                case "ArrowLeft":
                case "ArrowRight": {
                    event.preventDefault();
                    editorStore.setFocus();
                    const direction = event.key === "ArrowLeft" ? "left" : "right";

                    if (event.shiftKey) {
                        if (editorStore.hasCaret() || editorStore.hasVisualSelection()) {
                            editorStore.adjustSelection(direction, (event.ctrlKey || event.metaKey));
                        }
                    } else {
                        if (editorStore.hasCaret() || editorStore.hasVisualSelection()) {
                            editorStore.updatePosition(direction, (event.ctrlKey || event.metaKey));
                        } else {
                            editorStore.updatePosition();
                        }
                    }
                    break;
                }
                case "Home":
                    event.preventDefault();
                    editorStore.setFocus();
                    editorStore.jumpToStart();
                    return;

                case "End":
                    event.preventDefault();
                    editorStore.setFocus();
                    editorStore.jumpToEnd();
                    return;
            }
        };

        const handleKeyUp = (event) => {
            canAcceptInputRef.current = true;
        }

        const handleCopy = (event) => {
            if (!enable()) return;
            if (editorStore.hasVisualSelection() && !uiStore.isFormElementFocused()) {
                editorStore.copySelection(event);
            }
        };

        const handleCut = (event) => {
            if (!enable()) return;
            if (editorStore.hasVisualSelection() && !uiStore.isFormElementFocused()) {
                editorStore.handleCut(event);
            }
        };

        const handlePaste = (event) => {
            if (!enable()) return;
            if (!uiStore.isFormElementFocused()) {
                editorStore.handlePaste(event);
            }
        };

        const handleFocusChange = () => {
            const editorRef = editorStore.editorRef;
            if (editorRef) {
                editorStore.setEditorActive(uiStore.isVisualEditorFocused());
            }
        };

        const handleDocumentMouseDown = (event) => {
            // Check for mspace clicks (non-blocking)
            if (event.target && ML.isMathMLElement(event.target)) {
                toolbarStateStore.handleSpaceElementClick(event.target);
            }

            // Existing smart menu logic
            const menuEl = smartMenuStore.menuElement;
            if (
                smartMenuStore.isOpen &&
                menuEl &&
                !menuEl.contains(event.target)
            ) {
                smartMenuStore.close();
            }
        };

        // Event handlers for equation/user stores disabled (no backend stores in library)

        // --- Prevent visible text selection in contentEditable math editor (especially Chrome)
        // Chrome ignores `user-select: none` inside editable regions, so we collapse
        // any extended selection range back to a caret. This preserves `beforeinput`
        // behavior while ensuring no visible or copyable text selection appears.
        const handleSelectionChange = () => {
            if (!enable()) return;
            const editor = editorStore.editorRef;
            if (!editor) return;

            const sel = document.getSelection();
            if (!sel || sel.rangeCount === 0) return;

            const range = sel.getRangeAt(0);
            const container = range.commonAncestorContainer;

            if (!editor.contains(container)) return;

            const target = editor.querySelector(".caret-target");
            if (!target) return;

            const newRange = document.createRange();
            newRange.setStart(target, 0);
            newRange.collapse(false);

            // prevent recursion
            const current = sel.anchorNode === target && sel.anchorOffset === 0;
            if (current) return;

            sel.removeAllRanges();
            sel.addRange(newRange);
        };

        const resetGate = () => { canAcceptInputRef.current = true; };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("copy", handleCopy);
        window.addEventListener("cut", handleCut);
        window.addEventListener("paste", handlePaste);
        window.addEventListener('blur', resetGate);
        document.addEventListener("focusin", handleFocusChange);
        document.addEventListener("focusout", handleFocusChange);
        document.addEventListener("mousedown", handleDocumentMouseDown);
        document.addEventListener("selectionchange", handleSelectionChange);
        document.addEventListener('visibilitychange', resetGate);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("copy", handleCopy);
            window.removeEventListener("cut", handleCut);
            window.removeEventListener("paste", handlePaste);
            window.removeEventListener('blur', resetGate);
            document.removeEventListener("focusin", handleFocusChange);
            document.removeEventListener("focusout", handleFocusChange);
            document.removeEventListener("mousedown", handleDocumentMouseDown);
            document.removeEventListener("selectionchange", handleSelectionChange);
            document.removeEventListener('visibilitychange', resetGate);
        };
    }, []);

    return null;
};

export default GlobalKeyListener;
