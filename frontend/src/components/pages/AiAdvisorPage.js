import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';

const AiAdvisorPage = () => {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your AI Business Advisor powered by Claude. I have access to your business data. Ask me anything about your financials, payroll, rate card, unit economics, or how to grow your agency.",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load business context
    Promise.all([
      api.get('/unit-economics').catch(() => null),
      api.get('/payroll/monthly').catch(() => null),
      api.get('/pl-model').catch(() => null),
      api.get('/settings').catch(() => null),
    ]).then(([ue, payroll, pl, settings]) => {
      setBusinessContext({
        unitEconomics: ue?.data?.data?.metrics,
        unitEconomicsConfig: ue?.data?.data?.config,
        payroll: payroll?.data?.data?.summary,
        plMetrics: pl?.data?.data?.metrics,
        settings: settings?.data?.data?.settings,
      });
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const systemPrompt = businessContext ? `You are an AI Business Advisor for BizzOne Digital, a digital marketing and web development agency. You have access to their live business data:

UNIT ECONOMICS:
- Monthly net profit: CA$${businessContext.unitEconomics?.netProfitCad?.toFixed(0)}
- Break-even point: ${businessContext.unitEconomics?.breakEvenSites === Infinity ? 'Infinite (price is $0)' : businessContext.unitEconomics?.breakEvenSites + ' sites/mo'}
- Websites closed this month: ${businessContext.unitEconomicsConfig?.websitesClosedThisMonth}
- Standard price: CA$${businessContext.unitEconomicsConfig?.standardPriceCad}
- Contribution margin: ${businessContext.unitEconomics?.contributionMarginPercent?.toFixed(1)}%

PAYROLL:
- Active employees: ${businessContext.payroll?.activeCount}
- Total payroll/mo: CA$${businessContext.payroll?.totalNetCad?.toFixed(0)} (PKR ${(businessContext.payroll?.totalNetPkr / 1000)?.toFixed(0)}k)

P&L:
- Total revenue: CA$${businessContext.plMetrics?.totalRevenueCad?.toFixed(0)}
- MRR: CA$${businessContext.plMetrics?.mrrCad?.toFixed(0)} from ${businessContext.plMetrics?.activeRetainers} retainer clients
- Net profit: CA$${businessContext.plMetrics?.netProfitCad?.toFixed(0)} (${businessContext.plMetrics?.netMarginPercent?.toFixed(1)}% margin)
- LTV:CAC ratio: ${businessContext.plMetrics?.ltvCacRatio}:1
- CAC: CA$${businessContext.plMetrics?.cacCad?.toFixed(0)}

EXCHANGE RATES:
- USD to CAD: ${businessContext.settings?.usdToCad}
- 1 CAD = ${businessContext.settings?.cadToPkr} PKR

Be concise, actionable, and data-driven. Give specific recommendations. Format numbers clearly. Focus on revenue growth, profitability, and operational efficiency.` : 'You are an AI Business Advisor for BizzOne Digital. Loading business data...';

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({
          messages: newMessages.slice(1), // Skip system greeting
          systemPrompt,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please check your setup.' }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "Why is my business losing money?",
    "How many retainer clients do I need to break even?",
    "Which department costs the most?",
    "How can I improve my LTV:CAC ratio?",
    "What price should I set for websites?",
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Advisor</h2>
        <span style={{ fontSize: 12, padding: '2px 8px', background: 'rgba(236,72,153,0.15)', color: '#ec4899', borderRadius: 12, fontWeight: 600 }}>● Live · Claude-powered</span>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginRight: 8, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '72%',
              background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-card)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
              padding: '10px 14px',
              fontSize: 13,
              lineHeight: 1.6,
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
              Analyzing your business data...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="btn btn-secondary btn-sm" onClick={() => { setInput(s); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Ask about your financials, payroll, growth strategy..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: '8px 18px' }}>
          {loading ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

export default AiAdvisorPage;
