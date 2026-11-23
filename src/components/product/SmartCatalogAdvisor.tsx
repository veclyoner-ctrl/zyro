import React, { useState } from 'react';
import { BrainCircuit, Loader2, Send } from 'lucide-react';
import { analyzeCatalogQuery } from '../../services/productService';

const SAMPLE_PROMPTS = {
  catalog: [
    'Build a travel & work bundle under PKR 40,000 that qualifies for free shipping and ZYRO10 coupon.',
    'Compare your active audio and wearable tech products for daily commuting.',
  ],
  admin_report: [
    'Identify low-stock risks and recommend bundle promotions to raise average order value.',
    'Analyze current category mix and suggest restocking priorities for the next 30 days.',
  ],
};

export function SmartCatalogAdvisor({
  mode = 'catalog',
  title = 'Smart Shopping & Bundle Advisor',
  subtitle = 'Ask a multi-constraint question (budget in PKR, compatibility, coupon savings, or product comparisons).',
}: {
  mode?: 'catalog' | 'admin_report';
  title?: string;
  subtitle?: string;
}) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeCatalogQuery(text, mode);
      setAnswer(res.answer);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to analyze query.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runQuery(query);
  }

  return (
    <section className="bg-white border border-[#E8E8E8] rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display text-base font-semibold text-[#1A1A1A] flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#FF6B35]" />
            {title}
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Recommend a gift set under PKR 25,000 with free shipping..."
          aria-label={title}
          className="w-full sm:flex-1 h-10 px-3.5 rounded-lg border border-[#E8E8E8] bg-[#F8F8F8] focus:bg-white text-sm focus:outline-none focus:border-[#FF6B35]"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-10 px-5 rounded-lg bg-[#1A1A1A] hover:bg-[#333333] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Analyze
            </>
          )}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {SAMPLE_PROMPTS[mode].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setQuery(prompt);
              runQuery(prompt);
            }}
            className="text-xs text-[#6B7280] hover:text-[#FF6B35] bg-[#F8F8F8] hover:bg-[#FFF0EA] border border-[#E8E8E8] rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {error && (
        <div
          className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-4 p-4 rounded-lg bg-[#F8F8F8] border border-[#E8E8E8] text-sm text-[#1A1A1A] whitespace-pre-line leading-relaxed">
          {answer}
        </div>
      )}
    </section>
  );
}
