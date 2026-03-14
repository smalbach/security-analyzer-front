import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/**
 * A CodeMirror-based code editor with JavaScript syntax highlighting.
 * Provides IDE-like features: line numbers, bracket matching, auto-close,
 * history (undo/redo), fold gutter, and the One Dark theme.
 *
 * Autocompletes the available script API: env, pm, response, console, log.
 */
const scriptCompletions = [
  // Native API
  { label: 'env.get', type: 'function', info: 'Get environment variable', apply: 'env.get("")', boost: 10 },
  { label: 'env.set', type: 'function', info: 'Set environment variable', apply: 'env.set("", "")', boost: 10 },
  { label: 'response.json()', type: 'function', info: 'Get parsed response body', boost: 9 },
  { label: 'response.status', type: 'property', info: 'HTTP status code', boost: 9 },
  { label: 'response.headers', type: 'property', info: 'Response headers', boost: 8 },
  { label: 'log', type: 'function', info: 'Output to console tab', apply: 'log()', boost: 8 },

  // Postman-compatible API
  { label: 'pm.environment.set', type: 'function', info: 'Set env variable (Postman)', apply: 'pm.environment.set("", "")', boost: 7 },
  { label: 'pm.environment.get', type: 'function', info: 'Get env variable (Postman)', apply: 'pm.environment.get("")', boost: 7 },
  { label: 'pm.response.json()', type: 'function', info: 'Parsed response body (Postman)', boost: 6 },
  { label: 'pm.response.code', type: 'property', info: 'HTTP status code (Postman)', boost: 6 },
  { label: 'console.log', type: 'function', info: 'Output to console', apply: 'console.log()', boost: 5 },
];

function apiCompletions(context: { matchBefore: (re: RegExp) => { from: number; text: string } | null; explicit: boolean }) {
  const word = context.matchBefore(/[\w.]+/);
  if (!word && !context.explicit) return null;
  return {
    from: word?.from ?? 0,
    options: scriptCompletions,
  };
}

export function ScriptEditor({ value, onChange, placeholder, minHeight = '160px' }: ScriptEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        foldGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ override: [apiCompletions] }),
        javascript(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        cmPlaceholder(placeholder ?? ''),
        keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          /* The scroller is the element that actually scrolls — give it the
             minHeight so the editor grows with its content instead of
             showing a premature scrollbar on an empty document. */
          '.cm-scroller': {
            minHeight,
            overflow: 'auto',
          },
          '.cm-content': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            padding: '8px 0',
            minHeight,
          },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            minHeight,
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          },
          '.cm-cursor': {
            borderLeftColor: '#60a5fa',
          },
          '&.cm-focused': {
            outline: 'none',
            border: '1px solid rgba(96, 165, 250, 0.4)',
          },
          '.cm-tooltip.cm-tooltip-autocomplete': {
            backgroundColor: 'rgb(15, 23, 42)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
            padding: '4px 8px',
            fontSize: '11px',
          },
          '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            color: '#93c5fd',
          },
          '.cm-placeholder': {
            color: 'rgba(148, 163, 184, 0.4)',
            fontStyle: 'italic',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount — value syncing handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} />;
}
