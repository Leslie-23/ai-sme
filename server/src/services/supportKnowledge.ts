export interface SupportDoc {
  id: string;
  title: string;
  tags: string[];
  body: string;
}

export const SUPPORT_DOCS: SupportDoc[] = [
  {
    id: 'demo-sample-shop',
    title: 'Using the sample shop',
    tags: ['demo', 'sample', 'seed', 'reseed', 'try sample shop'],
    body:
      'The sample shop loads demo products, sales, expenses, payments, and stock movements so a user can explore the dashboard, reports, and Intellexa before entering real business data. On the dashboard and Settings workspace mode, Try sample shop or Reseed sample shop replaces the current workspace with sample data. Before loading the sample, the app attempts to save the current real workspace locally so the user can later restore former data.',
  },
  {
    id: 'real-business-mode',
    title: 'Returning to real business data',
    tags: ['real business', 'restore', 'start afresh', 'clear sample'],
    body:
      'When a user is done with the sample shop, Try with real business opens a choice. Continue with former data restores the locally saved workspace from before the demo. Start afresh clears sample records and leaves a blank workspace for real business setup. If no saved workspace exists, the user should start afresh and import or create real products, sales, and expenses.',
  },
  {
    id: 'onboarding',
    title: 'Pilot onboarding checklist',
    tags: ['onboarding', 'setup', 'first insight', 'pilot'],
    body:
      'The onboarding checklist is shown only for a real workspace. It guides the user to load products and opening stock, record or import sales, add monthly expenses, ask the first business question, and generate the first owner report. It disappears when all setup steps are complete and is hidden while the sample shop is active.',
  },
  {
    id: 'inventory',
    title: 'Inventory and stock adjustments',
    tags: ['inventory', 'products', 'stock', 'restock', 'adjustment', 'sku'],
    body:
      'Inventory is where users add products, SKUs, prices, cost prices, opening stock, and low-stock thresholds. Restock / adjust stock lets users search for products, select one, then apply a positive quantity to add stock or a negative quantity to remove stock. Notes can explain the reason for a correction, damage, count error, or supplier restock.',
  },
  {
    id: 'sales',
    title: 'Recording sales',
    tags: ['sales', 'cart', 'payment', 'cash', 'momo', 'card', 'transfer'],
    body:
      'Sales lets staff search products, add them to the cart, adjust quantities, remove mistaken cart items with the x button, select payment method, and record the sale. Recording a sale reduces product stock and feeds dashboard totals, fast-seller lists, payment mix, reports, and Intellexa answers.',
  },
  {
    id: 'import',
    title: 'Importing business data',
    tags: ['import', 'csv', 'excel', 'paste', 'products', 'sales', 'expenses', 'payments'],
    body:
      'Import is for pasting or attaching messy product lists, recent sales, expenses, and payments. The import assistant classifies records into structured preview buckets. Users should review the preview before saving. Products upsert by SKU; sales usually need known SKUs so products should be imported first.',
  },
  {
    id: 'intellexa',
    title: 'Intellexa business assistant',
    tags: ['intellexa', 'assistant', 'chat', 'date range', 'ai'],
    body:
      'Intellexa is the business-data assistant. It answers questions about sales, stock, expenses, payments, reports, restock lists, and next actions using the business data available to the account. The date range defaults to the first day of the current month through today, and users can change the range before sending a question. The dashboard New chat button archives the current dashboard conversation into Intellexa sessions and clears the dashboard chat.',
  },
  {
    id: 'reports',
    title: 'Reports and sharing',
    tags: ['reports', 'pdf', 'print', 'whatsapp', 'summary'],
    body:
      'Reports create owner-ready summaries from business data. Users can copy a WhatsApp-friendly summary, download a text report, or print/save as PDF from the browser. Reports are strongest after products, sales, and expenses have been added.',
  },
  {
    id: 'keys-ai',
    title: 'AI keys and default Groq access',
    tags: ['keys', 'groq', 'provider', 'api key', 'settings'],
    body:
      'AI provider keys are managed in Settings. Groq is the default provider when no account-specific provider is set. A shared server-side GROQ_API_KEY can provide a basic AI experience without exposing the key in the browser. Users should not paste private API keys into chat messages.',
  },
  {
    id: 'assisted-setup',
    title: 'Assisted setup requests',
    tags: ['book setup', 'assisted setup', 'whatsapp', 'email', 'support'],
    body:
      'Book assisted setup opens a form that captures name, email, WhatsApp or phone, business name, business type, current system, and first goal. The app saves the lead and opens email and WhatsApp drafts routed to the configured owner contact. It is meant for users who need help importing real shop data or preparing the first report.',
  },
  {
    id: 'billing-permissions',
    title: 'Plans and permissions',
    tags: ['billing', 'pro', 'trial', 'permissions', 'team', 'staff'],
    body:
      'Free accounts have limited records and no paid AI features. Pro unlocks Intellexa, reports, imports, and higher operating limits. Owners can invite staff and control permissions such as record sales, manage inventory, view reports, manage payments, manage expenses, and use Intellexa.',
  },
  {
    id: 'privacy-security',
    title: 'Privacy and security basics',
    tags: ['privacy', 'security', 'data', 'export'],
    body:
      'Business data is scoped by businessId. Users should only see records for their own business. Provider keys are encrypted at rest and not returned to the browser after saving. Paid accounts can export operating data. Users asking for deletion or data handling details should be directed to Privacy and assisted setup/support if they need help.',
  },
  {
    id: 'troubleshooting',
    title: 'Common troubleshooting',
    tags: ['error', 'problem', 'complaint', 'bug', 'not working', 'failed'],
    body:
      'For failed AI answers, check that the account has AI access, an available provider key or shared Groq key, and enough relevant business data in the selected date range. For missing dashboard insight, add products, sales, and expenses first. For import problems, simplify the paste, include SKUs, and review validation errors before applying. For urgent complaints, ask for the affected screen, what they clicked, the exact error message, and whether they want assisted setup follow-up.',
  },
];

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'what',
  'when',
  'where',
  'why',
  'with',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && !STOPWORDS.has(s));
}

export function retrieveSupportDocs(query: string, limit = 4): SupportDoc[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return SUPPORT_DOCS.slice(0, limit);
  const querySet = new Set(queryTokens);

  return SUPPORT_DOCS.map((doc) => {
    const haystack = `${doc.title} ${doc.tags.join(' ')} ${doc.body}`;
    const docTokens = tokenize(haystack);
    let score = 0;
    for (const token of docTokens) {
      if (querySet.has(token)) score += 1;
    }
    for (const tag of doc.tags) {
      if (query.toLowerCase().includes(tag.toLowerCase())) score += 4;
    }
    return { doc, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.doc);
}
