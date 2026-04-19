import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PricingGrid } from '../components/PricingGrid';

const DOT_GRID =
  'bg-[radial-gradient(circle,_#e5e5e5_1px,_transparent_1px)] [background-size:20px_20px]';
const DIAGONAL_LINES =
  'bg-[repeating-linear-gradient(135deg,_transparent_0_11px,_#f5f5f5_11px_12px)]';
const HORIZONTAL_LINES =
  'bg-[repeating-linear-gradient(0deg,_transparent_0_31px,_#f5f5f5_31px_32px)]';
const DARK_DOTS =
  'bg-[radial-gradient(circle,_#262626_1.2px,_transparent_1.2px)] [background-size:22px_22px]';

export function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? '/dashboard' : '/login?mode=register';
  const primaryLabel = user ? 'Go to dashboard' : 'Start free';
  const secondaryHref = user ? null : '/login';
  const secondaryLabel = user ? null : 'Sign in';

  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (y < 80) {
        setHidden(false);
        lastY.current = y;
        return;
      }
      const delta = y - lastY.current;
      if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-sm transition-transform duration-300 ${
          hidden && !mobileMenuOpen ? '-translate-y-full' : 'translate-y-0'
        } ${scrolled ? 'border-b border-neutral-200 shadow-[0_1px_0_rgba(0,0,0,0.02)]' : ''}`}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 md:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-3" onClick={() => setMobileMenuOpen(false)}>
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">AI · SME</span>
            <span className="text-xl font-semibold tracking-tight">Intellexa</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <a href="#product" className="btn-ghost !px-3 !py-1.5 text-sm">Product</a>
            <a href="#how" className="btn-ghost !px-3 !py-1.5 text-sm">How it works</a>
            <a href="#features" className="btn-ghost !px-3 !py-1.5 text-sm">Features</a>
            <a href="#pricing" className="btn-ghost !px-3 !py-1.5 text-sm">Pricing</a>
            <a href="#security" className="btn-ghost !px-3 !py-1.5 text-sm">Security</a>
            <a href="#faq" className="btn-ghost !px-3 !py-1.5 text-sm">FAQ</a>
            <Link to={primaryHref} className="btn-primary !px-4 !py-1.5 text-sm ml-2">
              {primaryLabel}
            </Link>
          </nav>
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`w-6 h-0.5 bg-neutral-900 transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-6 h-0.5 bg-neutral-900 transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-6 h-0.5 bg-neutral-900 transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[56px] md:hidden bg-white z-40 flex flex-col overflow-y-auto">
          <nav className="flex flex-col divide-y divide-neutral-200 flex-1">
            <a
              href="#product"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Product
            </a>
            <a
              href="#how"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <a
              href="#features"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#security"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Security
            </a>
            <a
              href="#faq"
              className="px-5 py-6 text-lg font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </a>
          </nav>
          
          <div className="border-t border-neutral-200 bg-neutral-50 p-5 space-y-4">
            <div>
              <div className="label mb-2">Why Intellexa</div>
              <ul className="space-y-2">
                <li className="text-sm text-neutral-600">No setup time • Live in an afternoon</li>
                <li className="text-sm text-neutral-600">You own all your data • Full export anytime</li>
                <li className="text-sm text-neutral-600">Transparent pricing • No surprises</li>
              </ul>
            </div>
            <div>
              <div className="label mb-2">Providers</div>
              <div className="text-xs text-neutral-600 space-y-1">
                <div>OpenAI • Anthropic • Google Gemini</div>
                <div>Groq • OpenRouter • Mistral • Cohere</div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-neutral-200">
            <Link
              to={primaryHref}
              className="btn-primary w-full text-center !px-5 !py-3 text-base"
              onClick={() => setMobileMenuOpen(false)}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      )}

      <section className={`relative border-b border-neutral-200 ${DOT_GRID} pt-24 md:pt-28 ${mobileMenuOpen ? 'overflow-hidden' : ''}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-5 gap-10 relative">
          <div className="lg:col-span-3 space-y-6">
            <span className="chip bg-white/80 backdrop-blur">AI-native business intelligence</span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Your business,
              <br />
              when you ask.
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 max-w-2xl">
              Intellexa turns your day-to-day sales, stock, and spending into a conversation. Ask in plain
              words — "what sold today?", "am I low on anything?" — and get honest numbers back,
              grounded on your live data.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to={primaryHref} className="btn-primary !px-5 !py-2.5">
                {primaryLabel}
              </Link>
              {secondaryHref && secondaryLabel ? (
                <Link to={secondaryHref} className="btn-secondary !px-5 !py-2.5">
                  {secondaryLabel}
                </Link>
              ) : (
                <a href="#how" className="btn-secondary !px-5 !py-2.5">
                  See how it works
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-6 text-xs text-neutral-500">
              {!user && <><span>14-day Pro trial</span><span className="text-neutral-300">·</span></>}
              <span>No credit card to start</span>
              <span className="text-neutral-300">·</span>
              <span>Cancel anytime</span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <MockChat />
          </div>
        </div>
      </section>

      <section id="product" className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 grid grid-cols-1 md:grid-cols-3 gap-0 [&>*]:border-neutral-200 md:[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-b md:[&>*:not(:last-child)]:border-b-0">
          <ValueProp
            label="Talk, don't dashboard"
            title="Ask in plain English."
            body="“What were my top 3 products this week?” “Am I low on anything?” “How does today compare to last Friday?” Intellexa answers with real figures from your books."
          />
          <ValueProp
            label="Grounded, never guessed"
            title="No hallucinated numbers."
            body="Every answer is computed from your live MongoDB via aggregation pipelines, then phrased by the model. If the data isn't there, Intellexa says so."
          />
          <ValueProp
            label="Runs on your AI"
            title="Pick any model you like."
            body="Plug in OpenAI, Anthropic, Google, Groq, OpenRouter, Mistral, or Cohere. Keys encrypted at rest. Swap providers in one click."
          />
        </div>
      </section>

      <section id="how" className={`relative border-b border-neutral-200 ${DIAGONAL_LINES}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <span className="label">Workflow</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
                From notebook to conversational BI in an afternoon.
              </h2>
            </div>
            <p className="text-neutral-600 max-w-md">
              Intellexa wraps a minimal CRUD layer — sales, inventory, expenses — with a chat-first AI.
              Owners ask; staff record. Numbers align by construction.
            </p>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-0 [&>*]:border-neutral-200 md:[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-b md:[&>*:not(:last-child)]:border-b-0 bg-white border border-neutral-200">
            <Step n={1} title="Sign up" body="Create a business in 30 seconds. Owner accounts are role-gated." />
            <Step n={2} title="Import" body="Chat your product list in. Paste from Excel, WhatsApp, or dictate — the AI extracts and you confirm." />
            <Step n={3} title="Operate" body="Staff record sales through the point-of-sale view; stock decrements atomically under concurrent writes." />
            <Step n={4} title="Ask" body="Open the Assistant and ask. Dashboards are there too, but the chat does the thinking." />
          </ol>
        </div>
      </section>

      <section className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="label">For the owner</span>
              <h3 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 mb-6">
                Stop chasing spreadsheets. Ask the business a question.
              </h3>
              <ul className="space-y-3 text-neutral-700">
                <Bullet>Revenue, profit, and expenses grouped however you phrase it.</Bullet>
                <Bullet>Stock alerts surfaced in the same chat, not a separate report.</Bullet>
                <Bullet>Compare this week vs last, month over month, channel vs channel.</Bullet>
                <Bullet>Get the answer in your currency, your timezone, your language.</Bullet>
              </ul>
            </div>
            <OwnerSnippet />
          </div>
        </div>
      </section>

      <section className={`border-b border-neutral-200 `}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <StaffSnippet />
            <div>
              <span className="label">For the staff</span>
              <h3 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 mb-6">
                A point-of-sale that doesn't fight you.
              </h3>
              <ul className="space-y-3 text-neutral-700">
                <Bullet>Search, tap, ring up. Four payment methods, one screen.</Bullet>
                <Bullet>Stock snapshots at sale time — no retroactive price drift.</Bullet>
                <Bullet>Sales history filters by date and method out of the box.</Bullet>
                <Bullet>Role-gated — only owners see sensitive settings.</Bullet>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="mb-10">
            <span className="label">What's inside</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
              Enough surface for a real shop. No more.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-neutral-200 [&>*]:border-neutral-200 [&>*]:p-6 md:[&>*:nth-child(odd)]:border-r lg:[&>*:nth-child(3n+1)]:border-r lg:[&>*:nth-child(3n+2)]:border-r lg:[&>*:nth-child(3n)]:border-r-0 [&>*]:border-b lg:[&>*:nth-last-child(-n+3)]:border-b-0">
            <Feature title="Point-of-sale" body="Search products, build a cart, take cash / card / momo / transfer. Atomic stock updates via $inc." />
            <Feature title="Inventory" body="SKU-scoped catalog with cost + selling price, stock levels, low-stock thresholds per product." />
            <Feature title="Sales history" body="Filter by date, payment method. Every line item keeps a snapshot of price at sale time." />
            <Feature title="Expenses & payments" body="Log costs by category. Payment ledger separates gross receipts from fees and losses." />
            <Feature title="Dashboard" body="Today / week / month totals, top products, low stock, payment breakdown, net profit." />
            <Feature title="Conversational import" body="Paste a raw product list; the AI maps it to your schema and shows a preview before writing." />
            <Feature title="Chat sessions" body="Every question persists. Start new threads, clear the current one, or switch between topics." />
            <Feature title="Multi-tenant & secure" body="JWT auth, bcrypt hashing, businessId scoping, AES-256-GCM for provider API keys." />
            <Feature title="Multi-currency" body="USD, EUR, GBP, NGN, GHS, KES, ZAR, XAF, XOF, and more. Owner sets it in Settings." />
          </div>
        </div>
      </section>

      <section className={`relative border-b border-neutral-200 bg-neutral-950 text-white ${DARK_DOTS}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <span className="label !text-neutral-400">Provider-agnostic</span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
                Seven AI providers. One abstraction.
              </h2>
            </div>
            <p className="text-neutral-400 max-w-md">
              Intellexa talks to whichever model makes sense for you today — free tier for bootstrapping,
              frontier for the heavy questions. Switch at any time in Settings.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-0 [&>*]:border-neutral-800 [&>*]:border-r [&>*]:border-b bg-neutral-950/80">
            {['OpenAI', 'Anthropic', 'Google Gemini', 'Groq', 'OpenRouter', 'Mistral', 'Cohere'].map(
              (p, i) => (
                <div
                  key={p}
                  className={`px-4 py-5 text-center text-sm font-medium tracking-tight ${
                    i === 6 ? 'lg:border-r-0' : ''
                  }`}
                >
                  {p}
                </div>
              )
            )}
          </div>
          <div className="mt-6 text-xs text-neutral-500 max-w-3xl">
            Free-tier tip: Groq gives you Llama-3.3-70b at ~600 tokens/sec. Google Gemini is free up to a
            very generous daily quota. Either will answer dashboard questions in under a second.
          </div>
        </div>
      </section>

      <section id="security" className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-neutral-200 [&>*]:p-8 [&>*]:border-neutral-200 lg:[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-b lg:[&>*:not(:last-child)]:border-b-0">
            <SecurityBlock
              label="01"
              title="Isolated by construction"
              body="Every document carries a businessId. Every query filters by it, pulled from the JWT — not from the request body. Cross-tenant reads aren't possible by policy or by code."
            />
            <SecurityBlock
              label="02"
              title="Encrypted provider keys"
              body="AI provider API keys are stored in Config with AES-256-GCM — random IV + auth tag per record. Decrypted in-memory only for the outbound provider call; never returned to the browser."
            />
            <SecurityBlock
              label="03"
              title="Minimal prompt surface"
              body="The AI never sees raw customer or transaction detail — only the aggregation summary needed for the current question. If a figure isn't in the snapshot, the prompt instructs the model to say so."
            />
          </div>
        </div>
      </section>

      <section className={`relative border-b border-neutral-200 bg-neutral-50`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="mb-12">
            <span className="label">Why choose Intellexa</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
              Built for you, not against you.
            </h2>
            <p className="text-neutral-600 mt-3 max-w-2xl">
              We've cut the noise and kept what matters. No complicated setup, no vendor lock-in, no surprises on your bill.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Start in minutes</h3>
              <p className="text-sm text-neutral-600">No month-long implementation. Sign up, import your products, invite your staff. You're live in an afternoon.</p>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">You own your data</h3>
              <p className="text-sm text-neutral-600">Everything lives in your MongoDB. Export whenever you want, via standard tools. No proprietary formats, no escape clauses.</p>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">No surprises</h3>
              <p className="text-sm text-neutral-600">Pay only for what you use. Bring your own AI key and pay the provider directly. No hidden markup, no seat licenses.</p>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Seriously private</h3>
              <p className="text-sm text-neutral-600">Your sales, stock, and costs never leave your server. The AI sees only what's needed for the current question.</p>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Switch providers anytime</h3>
              <p className="text-sm text-neutral-600">Locked into OpenAI? Leave. Found a cheaper option? Go. Change AI providers in one click, keep all your data.</p>
            </div>
            <div className="bg-white border border-neutral-200 p-6 rounded-lg">
              <div className="w-8 h-8 mb-3 text-neutral-900">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Built by makers</h3>
              <p className="text-sm text-neutral-600">We run small businesses too. We got tired of fancy tools that didn't fit. This is what we built for ourselves.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="mb-10 text-center">
            <span className="label">Pricing</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
              Simple plans. Start free.
            </h2>
            <p className="text-neutral-600 mt-3 max-w-xl mx-auto">
              Every new account gets a 14-day Pro trial. No credit card required to sign up.
            </p>
          </div>
          <PricingGrid loginRedirect="/login" callbackUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/pricing`} />
        </div>
      </section>

      <section id="faq" className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="mb-10">
            <span className="label">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">
              Answers to the usual worries.
            </h2>
          </div>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            <Faq
              q="Does Intellexa send my sales data to OpenAI?"
              a="Only the minimal business snapshot needed to answer the current question — sales totals, top products, low stock — is included in the prompt. Raw customer details are never sent. You can also pick an open-weights provider like Groq/OpenRouter if you want to keep data away from closed-API vendors."
            />
            <Faq
              q="Can the AI make up numbers?"
              a="No. The numbers are computed server-side via MongoDB aggregations before the model sees anything. The model only phrases the answer. If a figure isn't in the snapshot, the prompt instructs it to say so."
            />
            <Faq
              q="Is my provider API key safe?"
              a="Keys are encrypted with AES-256-GCM (random IV + auth tag) before hitting the database. They are decrypted in-memory only when making a provider call, and never returned to the browser."
            />
            <Faq
              q="Can I try it without a paid AI key?"
              a="Yes. Groq, Google Gemini, OpenRouter, Mistral, and Cohere all offer free tiers that work out of the box. Gemini and Groq are the fastest to set up."
            />
            <Faq
              q="Who is this for?"
              a="Small retailers and service businesses — shops with 1–20 staff and a handful to a few hundred SKUs. If your operations fit in a WhatsApp group and a notebook today, Intellexa is sized for you."
            />
            <Faq
              q="Can multiple staff log in?"
              a="Yes. An owner account can invite staff accounts. Staff can record sales and update stock; they can't change AI provider, currency, or billing settings."
            />
            <Faq
              q="What happens if I change currency later?"
              a="Future totals render in the new currency. Existing totals aren't converted — the underlying numbers stay, only the symbol changes. Most owners only change this once, at setup."
            />
            <Faq
              q="Can I export my data?"
              a="Yes. Business-plan accounts get one-click JSON and CSV exports of everything — products, sales, payments, expenses — from the Billing settings. On any plan the data remains yours and can be pulled directly from MongoDB if you need it."
            />
            <Faq
              q="Is there a free trial?"
              a="Every new account gets 14 days of Pro access, automatically. No credit card required to sign up. When the trial ends, you stay on Free (50 products, 200 sales/month, no AI) unless you upgrade."
            />
            <Faq
              q="What's the difference between Pro and Business?"
              a="Pro ($15/mo) unlocks the AI Assistant, imports, Reports, and unlimited records — everything a solo operator needs. Business ($39/mo) adds priority email support, a 30-minute onboarding call, on-demand data exports, and early access to new features — for owners who want a human in the loop."
            />
            <Faq
              q="How am I charged?"
              a="Payments are processed by Paystack in USD. You'll be billed monthly on the same day you subscribed. You can cancel at any time from Settings → Billing — you keep Pro access until the end of the current period."
            />
            <Faq
              q="Can I switch plans?"
              a="Yes. Upgrade from Free to Pro or Business whenever you're ready. Downgrades take effect at the end of your current billing period."
            />
            <Faq
              q="What happens if my payment fails?"
              a="You stay on your plan in a past-due state for a grace window while we retry. If the retries don't clear, the subscription is canceled and your account drops to Free — your data is never deleted."
            />
          </div>
        </div>
      </section>

      <section className={`${DIAGONAL_LINES}`}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Ready to ask?</h2>
            <p className="text-neutral-600 mt-3 max-w-xl">
              Sign in, bring your AI key, and you'll be chatting with your business data in minutes.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={primaryHref} className="btn-primary !px-6 !py-3 text-base">
              {primaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">AI · SME</span>
              <span className="text-lg font-semibold">Intellexa</span>
            </div>
            <p className="text-sm text-neutral-600 mt-3 max-w-sm">
              AI-native business intelligence, sized for the shop around the corner.
            </p>
          </div>
          <div>
            <div className="label mb-3">Product</div>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li><a href="#product" className="hover:text-neutral-900">Overview</a></li>
              <li><a href="#how" className="hover:text-neutral-900">How it works</a></li>
              <li><a href="#features" className="hover:text-neutral-900">Features</a></li>
            </ul>
          </div>
          <div>
            <div className="label mb-3">More</div>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li><a href="#pricing" className="hover:text-neutral-900">Pricing</a></li>
              <li><a href="#security" className="hover:text-neutral-900">Security</a></li>
              <li><a href="#faq" className="hover:text-neutral-900">FAQ</a></li>
              <li><Link to={primaryHref} className="hover:text-neutral-900">{primaryLabel}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-neutral-200">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-5 text-xs text-neutral-500">
            © {new Date().getFullYear()} Intellexa. Built for small businesses.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ValueProp({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="p-8 md:p-10 bg-white">
      <span className="label">{label}</span>
      <h3 className="text-2xl font-semibold tracking-tight mt-3">{title}</h3>
      <p className="text-neutral-600 mt-3 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="p-6 md:p-7">
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-mono text-neutral-400">0{n}</span>
        <div className="section-title">{title}</div>
      </div>
      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white">
      <div className="section-title">{title}</div>
      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm md:text-base">
      <span className="mt-2 w-1.5 h-1.5 bg-neutral-900 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function SecurityBlock({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="bg-white">
      <span className="text-[10px] font-mono text-neutral-400">{label}</span>
      <h3 className="text-lg font-semibold mt-2 tracking-tight">{title}</h3>
      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function TechCell({ cat, items }: { cat: string; items: string[] }) {
  return (
    <div className="bg-white">
      <div className="label">{cat}</div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-800 font-medium">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group py-4">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="text-base font-medium text-neutral-900">{q}</span>
        <span className="text-neutral-400 group-open:rotate-45 transition-transform text-lg leading-none">
          +
        </span>
      </summary>
      <p className="text-sm text-neutral-600 mt-3 leading-relaxed">{a}</p>
    </details>
  );
}

type ChatTurn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; thinkMs: number };

const CHAT_SCRIPT: ChatTurn[] = [
  { role: 'user', text: 'What were my top 3 products this month?' },
  {
    role: 'assistant',
    thinkMs: 300,
    text:
      'This month so far:\n• TCL Smart TV 50" — €13,500 (3 units)\n• Nasco Fridge/Freezer — €5,590 (2 units)\n• Midea A/C — €4,800 (1 unit)',
  },
  { role: 'user', text: 'Am I low on anything?' },
  {
    role: 'assistant',
    thinkMs: 300,
    text:
      'Three SKUs below threshold: Samsung Microwave (1/2), Midea A/C (1/2), Counting Machine (1/2). Want me to draft a restock list?',
  },
];

function MockChat() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const current = step < CHAT_SCRIPT.length ? CHAT_SCRIPT[step] : null;
  // Thinking state is derived from render signals so the effect below can
  // schedule the reveal timeout without re-entering and cancelling itself.
  const thinking = current?.role === 'assistant' && typed === '';

  // Drive the scripted conversation: type user msgs char-by-char, pause on
  // assistant turns (the dots render while typed === ''), then reveal the
  // reply all at once, hold, and advance.
  useEffect(() => {
    if (step >= CHAT_SCRIPT.length) {
      const t = setTimeout(() => {
        setStep(0);
        setTyped('');
      }, 2800);
      return () => clearTimeout(t);
    }
    const turn = CHAT_SCRIPT[step];
    if (turn.role === 'user') {
      if (typed.length < turn.text.length) {
        const t = setTimeout(() => setTyped(turn.text.slice(0, typed.length + 1)), 32);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setStep(step + 1);
        setTyped('');
      }, 450);
      return () => clearTimeout(t);
    }
    // assistant turn
    if (typed === '') {
      const t = setTimeout(() => setTyped(turn.text), turn.thinkMs);
      return () => clearTimeout(t);
    }
    if (typed === turn.text) {
      const t = setTimeout(() => {
        setStep(step + 1);
        setTyped('');
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [step, typed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [step, typed]);

  const history = CHAT_SCRIPT.slice(0, step);

  return (
    <div className="card shadow-[0_4px_32px_rgba(0,0,0,0.04)]">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <div className="section-title flex items-center gap-2">
            Assistant
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <span className="relative rounded-full bg-emerald-500 h-2 w-2" />
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">Grounded on live data</div>
        </div>
        <span className="chip">Live demo</span>
      </div>
      <div
        ref={scrollRef}
        className="p-4 space-y-3 text-sm h-[320px] overflow-hidden flex flex-col justify-end"
      >
        {history.map((m, i) => (
          <ChatBubble key={i} role={m.role} text={m.text} />
        ))}
        {current && current.role === 'user' && typed.length > 0 && (
          <ChatBubble role="user" text={typed} caret />
        )}
        {current && current.role === 'assistant' && thinking && <TypingDots />}
        {current && current.role === 'assistant' && !thinking && typed.length > 0 && (
          <ChatBubble role="assistant" text={typed} />
        )}
      </div>
      <div className="border-t border-neutral-200 p-3 flex gap-2">
        <div className="input flex-1 text-neutral-400 select-none">
          {current?.role === 'user' ? typed + (typed ? '' : '') : 'Ask about your business…'}
        </div>
        <div className="btn-primary !px-4 text-sm select-none">Send</div>
      </div>
    </div>
  );
}

function ChatBubble({ role, text, caret }: { role: 'user' | 'assistant'; text: string; caret?: boolean }) {
  const lines = text.split('\n');
  return (
    <div className={`flex animate-chat-in ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] px-3.5 py-2 border whitespace-pre-line ${
          role === 'user'
            ? 'bg-neutral-900 text-white border-neutral-900'
            : 'bg-white border-neutral-200'
        }`}
      >
        {lines.map((ln, i) => (
          <span key={i}>
            {ln}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
        {caret && <span className="inline-block w-[7px] h-[14px] align-middle bg-white/80 ml-0.5 animate-caret" />}
        {role === 'assistant' && !caret && (
          <div className="text-[10px] uppercase tracking-wider mt-2 opacity-60">gpt-4o</div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start animate-chat-in">
      <div className="px-3.5 py-2.5 border bg-white border-neutral-200 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-dot" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-dot" style={{ animationDelay: '160ms' }} />
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-dot" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  );
}

const OWNER_SCENES = [
  {
    month: 'This month',
    revenue: 24310,
    profit: 5820,
    lowStock: 7,
    rows: [
      { name: 'TCL Smart TV 50"', value: 13500 },
      { name: 'Nasco Fridge/Freezer', value: 5590 },
      { name: 'Midea A/C', value: 4800 },
    ],
  },
  {
    month: 'Last month',
    revenue: 19870,
    profit: 4210,
    lowStock: 4,
    rows: [
      { name: 'Samsung Microwave', value: 6200 },
      { name: 'TCL Smart TV 50"', value: 4500 },
      { name: 'Bardefu Blender', value: 2780 },
    ],
  },
];

function useCounter(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    prev.current = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function OwnerSnippet() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % OWNER_SCENES.length), 4200);
    return () => clearInterval(t);
  }, []);
  const scene = OWNER_SCENES[idx];
  const revenue = useCounter(scene.revenue);
  const profit = useCounter(scene.profit);
  const lowStock = useCounter(scene.lowStock);
  return (
    <div className="card p-5 space-y-3 shadow-[0_4px_32px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <span className="label flex items-center gap-2">
          <span key={scene.month} className="inline-block animate-fade-in">Overview · {scene.month}</span>
        </span>
        <span className="chip">EUR</span>
      </div>
      <div className="grid grid-cols-3 gap-0 border border-neutral-200 [&>*]:p-4 [&>*:not(:last-child)]:border-r [&>*]:border-neutral-200">
        <div>
          <div className="label">Revenue</div>
          <div className="text-xl font-semibold mt-1 tabular-nums">€{revenue.toLocaleString()}</div>
        </div>
        <div>
          <div className="label">Net profit</div>
          <div className="text-xl font-semibold mt-1 tabular-nums">€{profit.toLocaleString()}</div>
        </div>
        <div>
          <div className="label">Low stock</div>
          <div className="text-xl font-semibold mt-1 tabular-nums text-amber-700">{lowStock}</div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        {scene.rows.map((r, i) => (
          <div
            key={`${idx}-${r.name}`}
            className="flex justify-between text-sm animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-neutral-700">{r.name}</span>
            <span className="tabular-nums font-semibold">€{r.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STAFF_SCRIPT: { name: string; qty: number; unit: number }[][] = [
  [
    { name: 'TCL Smart TV 50"', qty: 1, unit: 4500 },
    { name: 'Bardefu Blender', qty: 2, unit: 550 },
  ],
  [
    { name: 'Samsung Microwave', qty: 1, unit: 1850 },
    { name: 'Counting Machine', qty: 1, unit: 890 },
    { name: 'Nasco Fridge/Freezer', qty: 1, unit: 2795 },
  ],
  [
    { name: 'Midea A/C', qty: 2, unit: 2400 },
  ],
];

function StaffSnippet() {
  const [cartIdx, setCartIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const target = STAFF_SCRIPT[cartIdx];
    if (revealed < target.length) {
      const t = setTimeout(() => setRevealed((r) => r + 1), 700);
      return () => clearTimeout(t);
    }
    // Cart is complete — flash the "Record sale" button, then reset.
    const t1 = setTimeout(() => setRecording(true), 1200);
    const t2 = setTimeout(() => {
      setRecording(false);
      setRevealed(0);
      setCartIdx((i) => (i + 1) % STAFF_SCRIPT.length);
    }, 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cartIdx, revealed]);

  const items = STAFF_SCRIPT[cartIdx].slice(0, revealed);
  const total = useMemo(() => items.reduce((s, it) => s + it.qty * it.unit, 0), [items]);
  const animatedTotal = useCounter(total, 400);

  return (
    <div className="card p-5 shadow-[0_4px_32px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <span className="label">New sale</span>
        <span className="chip">Cashier</span>
      </div>
      <div className="border border-neutral-200 min-h-[148px]">
        {items.length === 0 && (
          <div className="px-3 py-6 text-xs text-neutral-400 text-center">Scanning items…</div>
        )}
        {items.map((it, i) => (
          <div
            key={`${cartIdx}-${i}`}
            className={`px-3 py-2 text-sm border-b border-neutral-200 flex items-center justify-between animate-slide-in`}
          >
            <span>{it.name}</span>
            <span className="tabular-nums text-neutral-500">×{it.qty}</span>
            <span className="tabular-nums font-semibold w-20 text-right">
              €{(it.qty * it.unit).toLocaleString()}
            </span>
          </div>
        ))}
        {items.length > 0 && (
          <div className="px-3 py-2 text-sm flex items-center justify-between bg-neutral-50">
            <span className="font-medium">Total</span>
            <span></span>
            <span className="tabular-nums font-semibold w-20 text-right">
              €{animatedTotal.toLocaleString()}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="input !py-1.5 text-xs flex-1">Cash</div>
        <div
          className={`btn-primary !px-4 !py-1.5 text-sm transition-transform ${
            recording ? 'scale-[0.97] opacity-80' : ''
          }`}
        >
          {recording ? 'Recorded ✓' : 'Record sale'}
        </div>
      </div>
    </div>
  );
}
