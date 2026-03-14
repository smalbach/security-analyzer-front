import { useEffect, useState } from 'react';
import { useHelp } from '../contexts/HelpContext';
import { HELP_SECTIONS } from '../lib/helpContent';

export function HelpPanel() {
  const { isOpen, activeSection, closeHelp, openHelp } = useHelp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  function handleTransitionEnd() {
    if (!isOpen) setMounted(false);
  }

  if (!mounted) return null;

  const currentSection = HELP_SECTIONS.find((s) => s.id === activeSection) ?? HELP_SECTIONS[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: isOpen ? 1 : 0 }}
        onClick={closeHelp}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-[200] flex h-screen w-full max-w-[380px] flex-col overflow-hidden shadow-2xl transition-transform duration-[240ms]"
        style={{
          background: 'rgba(var(--bg-900), 0.97)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid var(--surface-border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
        onTransitionEnd={handleTransitionEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Help documentation"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--surface-border)' }}
        >
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgb(var(--accent-400))' }}
            >
              Help &amp; Docs
            </p>
            <p className="mt-0.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {currentSection.title}
            </p>
          </div>
          <button
            type="button"
            onClick={closeHelp}
            aria-label="Close help panel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>

        {/* Section tabs */}
        <div
          className="flex gap-1 overflow-x-auto px-4 py-2"
          style={{ borderBottom: '1px solid var(--surface-border)' }}
        >
          {HELP_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => openHelp(section.id)}
              className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              style={
                section.id === activeSection
                  ? {
                      background: 'rgba(var(--accent-400), 0.15)',
                      color: 'rgb(var(--accent-300))',
                    }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {section.icon} {section.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {currentSection.intro}
          </p>

          <div className="space-y-5">
            {currentSection.steps.map((step) => (
              <div key={step.step} className="flex gap-3">
                {/* Step number */}
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(var(--accent-400), 0.15)',
                    color: 'rgb(var(--accent-300))',
                  }}
                >
                  {step.step}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="mb-1 text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.body}
                  </p>

                  {step.tip ? (
                    <div
                      className="mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed"
                      style={{
                        background: 'rgba(249, 115, 22, 0.08)',
                        borderLeft: '2px solid rgba(249, 115, 22, 0.5)',
                        color: '#fbbf6a',
                      }}
                    >
                      <span className="font-semibold">Tip: </span>
                      {step.tip}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
