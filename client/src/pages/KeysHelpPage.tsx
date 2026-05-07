import { Link } from 'react-router-dom';

export function KeysHelpPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="card p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Help</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">Get the keys</h1>
        <p className="text-sm text-neutral-600 mt-3 max-w-2xl">
          This page is for the owner who needs the API keys and setup details before the assistant
          can be configured properly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Step n={1} title="Open provider settings" body="Go to Settings, then the Active provider section." />
        <Step n={2} title="Choose a provider" body="Pick the provider you want to use for the assistant." />
        <Step n={3} title="Paste the API key" body="Add the provider key, save, then return to the dashboard." />
      </div>

      <div className="card p-5 space-y-3">
        <div className="section-title">What to prepare</div>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li>API key for the provider you want to use.</li>
          <li>Optional model override if you want a specific model.</li>
          <li>Business timezone and currency if they need confirming.</li>
        </ul>
      </div>

      <div className="card p-5 space-y-3">
        <div className="section-title">If you are only demoing</div>
        <p className="text-sm text-neutral-600">
          You can leave this page and use the sample shop without entering keys. Keys matter when
          you want real owner questions, reports, and imports to run against a live provider.
        </p>
        <Link to="/settings" className="btn-primary !px-4 !py-2 text-sm inline-flex">
          Open settings
        </Link>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] font-mono text-neutral-400">0{n}</div>
      <div className="section-title mt-2">{title}</div>
      <p className="text-sm text-neutral-600 mt-2">{body}</p>
    </div>
  );
}
