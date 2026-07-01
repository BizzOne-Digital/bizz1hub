const { AppError } = require('../middleware/errorHandler');
const Settings = require('../models/Settings.model');
const Employee = require('../models/Employee.model');

/**
 * POST /api/ai/chat
 * Proxies chat to Claude (Anthropic) with live business context injected.
 * Requires ANTHROPIC_API_KEY in .env
 */
exports.chat = async (req, res, next) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return next(new AppError('messages array is required', 400));
    }

    // Fetch live context if not provided by client
    let businessContext = context || '';
    if (!businessContext) {
      const settings = await Settings.getSettings();
      const employees = await Employee.find({ isActive: true }).lean();
      const totalPayrollPkr = employees.reduce((sum, e) => sum + (e.baseSalaryPkr || 0), 0);
      const totalPayrollCad = totalPayrollPkr / settings.pkrPerUsd / (settings.usdToCad || 1.35);

      businessContext = `
Company: ${settings.companyName}
Active Employees: ${employees.length}
Total Monthly Payroll: CA$${totalPayrollCad.toFixed(0)}
Exchange Rate: 1 USD = ${settings.pkrPerUsd} PKR | 1 CAD ≈ ${(settings.pkrPerUsd / (settings.usdToCad || 1.35)).toFixed(0)} PKR
      `.trim();
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return next(new AppError('AI Advisor is not configured. Please add ANTHROPIC_API_KEY to your .env file.', 503));
    }

    const systemPrompt = `You are the AI Business Advisor for ${(await Settings.getSettings()).companyName}, a digital marketing, sales automation, and web/app development agency.

You have access to the following live business data:
${businessContext}

Your role:
- Analyse financial metrics, identify problems, and provide actionable recommendations
- Answer questions about payroll, unit economics, P&L, rate cards, and commissions
- Be direct, professional, and specific — always use the actual numbers provided
- Format responses clearly using plain text (no markdown headers)
- If data seems off, flag it and suggest corrections

Always be concise. Lead with the key insight, then explain.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errBody);
      return next(new AppError('AI service error. Please try again.', 502));
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'No response generated.';

    res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
};
