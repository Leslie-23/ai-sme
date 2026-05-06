export function PrivacyPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="card p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Privacy and security
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
          Plain-English data handling for pilot customers
        </h1>
        <p className="text-sm text-neutral-600 mt-3 max-w-3xl">
          Intellexa is built for small businesses that need practical insight without losing control
          of their operating records. Use this page in demos to explain what is stored, what the AI
          sees, and how owners keep access under control.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PrivacyCard
          title="What data is stored"
          body="Business accounts store products, stock levels, sales, payment records, expenses, team members, settings, and AI query logs. Each record is scoped to the authenticated business."
        />
        <PrivacyCard
          title="What the AI sees"
          body="The assistant is designed to receive only the business snapshot needed for the current question, such as totals, top products, low stock, expenses, and report context. It should not need raw customer details for owner-level answers."
        />
        <PrivacyCard
          title="Who can access data"
          body="Owners have full access. Staff access is controlled with permissions for sales, inventory, reports, expenses, payments, and AI. Sensitive settings remain owner-controlled."
        />
        <PrivacyCard
          title="Provider keys"
          body="AI provider keys are stored encrypted at rest and are not returned to the browser after saving. They are decrypted only when the server needs to call the configured provider."
        />
        <PrivacyCard
          title="Export and portability"
          body="Business-plan accounts have export support for operational data. This matters for pilots because owners should know the records remain portable if they outgrow the pilot."
        />
        <PrivacyCard
          title="Deletion and support"
          body="For pilots, document who requested setup, what data was imported, and how to remove or export it if the customer does not continue. Keep this as part of your onboarding checklist."
        />
      </div>

      <div className="card p-5">
        <div className="section-title">Demo guidance</div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-700">
          <li>Explain data handling before asking for a real product or sales file.</li>
          <li>Use sample data for first demos, then import real data only after the owner agrees.</li>
          <li>Keep AI provider setup behind the scenes unless the owner asks about it.</li>
          <li>Use staff permissions to show how cashiers can record sales without seeing reports or billing.</li>
        </ul>
      </div>
    </div>
  );
}

function PrivacyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="section-title">{title}</div>
      <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
