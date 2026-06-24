"use client";

import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from "react";
import {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter,
  highlightSpecialChars, drawSelection, dropCursor,
  rectangularSelection, crosshairCursor, highlightActiveLine,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  syntaxHighlighting, defaultHighlightStyle, bracketMatching,
  foldGutter, foldKeymap, indentOnInput,
} from "@codemirror/language";
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  disabled?: boolean;
  minHeight?: string;
  /**
   * Optional ref that the parent can hold. When mounted, the ref's `.current`
   * is set to a function that inserts `code` at the editor's current cursor
   * position (used by the snippets sidebar). When the editor unmounts, the
   * ref is cleared back to null.
   */
  onInsertRef?: MutableRefObject<((code: string) => void) | null>;
}

// Minimal typed extension for compartments stored on the EditorView instance
interface EditorViewExt extends EditorView {
  __readOnly?: Compartment;
}

export function HtmlEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  minHeight = "340px",
  onInsertRef,
}: HtmlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latestValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);

  // useLayoutEffect keeps these refs current synchronously after every
  // render, avoiding the "ref write during render" React 19 lint warning.
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  // ── Mount the editor exactly once ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return;

    const readOnly = new Compartment();

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        latestValueRef.current = newValue;
        onChangeRef.current(newValue);
      }
    });

    const blurListener = EditorView.domEventHandlers({
      blur() {
        onBlurRef.current?.(latestValueRef.current);
      },
    });

    const state = EditorState.create({
      doc: latestValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        autocompletion(),
        html({ autoCloseTags: true }),
        oneDark,
        EditorView.theme({
          "&": {
            fontSize: "12.5px",
            fontFamily: "'JetBrains Mono','Fira Mono','Cascadia Code',ui-monospace,monospace",
            minHeight,
            height: "100%",
            borderRadius: "0",
          },
          ".cm-scroller": { overflow: "auto", minHeight, height: "100%" },
          ".cm-content": { minHeight },
          ".cm-focused": { outline: "none" },
        }),
        keymap.of([
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        readOnly.of(EditorState.readOnly.of(false)),
        updateListener,
        blurListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    (view as EditorViewExt).__readOnly = readOnly;

    // Expose the insert-at-cursor function through the ref
    if (onInsertRef) {
      onInsertRef.current = (code: string) => {
        const v = viewRef.current;
        if (!v) return;
        const { from, to } = v.state.selection.main;
        v.dispatch({
          changes: { from, to, insert: code },
          selection: { anchor: from + code.length },
        });
        v.focus();
      };
    }

    return () => {
      view.destroy();
      viewRef.current = null;
      if (onInsertRef) onInsertRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync externally-driven value changes ───────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      latestValueRef.current = value;
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // ── Sync disabled → readOnly compartment ──────────────────────────────
  useEffect(() => {
    const view = viewRef.current as EditorViewExt | null;
    if (!view?.__readOnly) return;
    view.dispatch({ effects: view.__readOnly.reconfigure(EditorState.readOnly.of(disabled)) });
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      style={{ opacity: disabled ? 0.6 : 1 }}
      aria-label="HTML email editor"
    />
  );
}
