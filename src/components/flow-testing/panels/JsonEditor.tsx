import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
} from '@codemirror/language';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import type { TemplateCompletion } from '../../../hooks/useTemplateCompletions';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  /** Optional template variable completions — triggers on {{ */
  templateCompletions?: TemplateCompletion[];
}

/** JSON linter — highlights parse errors inline. */
const jsonLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc.toString();
  if (!doc.trim()) return diagnostics;
  try {
    JSON.parse(doc);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const match = msg.match(/position\s+(\d+)/i);
    const pos = match ? Math.min(parseInt(match[1], 10), doc.length) : 0;
    diagnostics.push({
      from: pos,
      to: Math.min(pos + 1, doc.length),
      severity: 'error',
      message: msg,
    });
  }
  return diagnostics;
});

/**
 * A CodeMirror-based JSON editor with syntax highlighting, linting,
 * bracket matching, auto-close, and optional template variable autocomplete.
 * Designed for node config panels.
 */
export function JsonEditor({
  value,
  onChange,
  placeholder,
  minHeight = '80px',
  templateCompletions,
}: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Ref for completions so the CodeMirror closure always reads latest
  const completionsRef = useRef(templateCompletions);
  completionsRef.current = templateCompletions;

  useEffect(() => {
    if (!containerRef.current) return;

    // Template variable completion source — triggers on {{
    const templateCompletionSource = (context: CompletionContext) => {
      const match = context.matchBefore(/\{\{[\w.]*/);
      if (!match) return null;
      const items = completionsRef.current;
      if (!items?.length) return null;
      return {
        from: match.from,
        options: items.map((c) => ({
          label: c.displayLabel,
          apply: c.label,
          info: c.detail,
          type:
            c.type === 'env' || c.type === 'var' ? 'variable' : 'property',
          boost: c.boost,
        })),
      };
    };

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
        autocompletion({
          override: [templateCompletionSource],
          activateOnTyping: true,
        }),
        json(),
        jsonLinter,
        oneDark,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        cmPlaceholder(placeholder ?? ''),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '11px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          '.cm-scroller': {
            minHeight,
            overflow: 'auto',
          },
          '.cm-content': {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            padding: '6px 0',
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
          '.cm-placeholder': {
            color: 'rgba(148, 163, 184, 0.4)',
            fontStyle: 'italic',
          },
          /* Lint error styling */
          '.cm-diagnostic-error': {
            borderLeft: '3px solid #ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            padding: '2px 6px',
            fontSize: '10px',
            color: '#fca5a5',
          },
          '.cm-lint-marker-error': {
            content: '"●"',
          },
          '.cm-tooltip-lint': {
            backgroundColor: 'rgb(15, 23, 42)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
          },
          /* Autocomplete tooltip styling */
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
