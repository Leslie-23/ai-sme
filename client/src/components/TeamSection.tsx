import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { AuthPermissions, useAuth } from '../context/AuthContext';

interface TeamMember {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  name: string | null;
  roleLabel: string | null;
  permissions: AuthPermissions;
  createdAt: string;
}

const PERMISSION_LABELS: { key: keyof AuthPermissions; label: string; hint: string }[] = [
  { key: 'recordSales', label: 'Record sales', hint: 'Use the point-of-sale to ring up orders' },
  { key: 'manageInventory', label: 'Manage inventory', hint: 'Add, edit, import products' },
  { key: 'viewReports', label: 'View reports', hint: 'All-time reports with AI insights' },
  { key: 'managePayments', label: 'Manage payments', hint: 'Non-sale money in (transfers, refunds)' },
  { key: 'manageExpenses', label: 'Manage expenses', hint: 'Log operating costs' },
  { key: 'useAI', label: 'Use AI Assistant', hint: 'Chat with business data' },
];

const ROLE_SUGGESTIONS = ['Sales rep', 'Cashier', 'Accountant', 'Inventory manager', 'Shift lead'];

const DEFAULT_NEW_PERMS: AuthPermissions = {
  recordSales: true,
  manageInventory: false,
  viewReports: false,
  managePayments: false,
  manageExpenses: false,
  useAI: false,
};

export function TeamSection() {
  const { user } = useAuth();
  const canManage = user?.role === 'OWNER';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('Sales rep');
  const [newPerms, setNewPerms] = useState<AuthPermissions>(DEFAULT_NEW_PERMS);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      const data = await api<{ members: TeamMember[] }>('/team');
      setMembers(data.members);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setCreating(true);
    try {
      await api('/team', {
        method: 'POST',
        body: {
          email: newEmail.trim(),
          password: newPassword,
          name: newName.trim() || undefined,
          roleLabel: newRoleLabel.trim() || undefined,
          permissions: newPerms,
        },
      });
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRoleLabel('Sales rep');
      setNewPerms(DEFAULT_NEW_PERMS);
      setShowForm(false);
      setNotice('Team member added. Share their email and password with them.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add member');
    } finally {
      setCreating(false);
    }
  }

  async function onUpdate(m: TeamMember, patch: Partial<TeamMember> & { password?: string }) {
    setError(null);
    try {
      await api(`/team/${m.id}`, {
        method: 'PATCH',
        body: {
          name: patch.name,
          roleLabel: patch.roleLabel,
          permissions: patch.permissions,
          password: patch.password,
        },
      });
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    }
  }

  async function onDelete(m: TeamMember) {
    if (!confirm(`Remove ${m.email} from this business? They will lose access immediately.`)) return;
    setError(null);
    try {
      await api(`/team/${m.id}`, { method: 'DELETE' });
      setNotice(`Removed ${m.email}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    }
  }

  async function onResetPassword(m: TeamMember) {
    const next = prompt(`Set a new password for ${m.email} (min 8 characters):`);
    if (!next) return;
    if (next.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    await onUpdate(m, { password: next });
    setNotice(`Password updated for ${m.email}. Share it with them out-of-band.`);
  }

  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
        <div className="section-title">Team</div>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-ghost !border !border-neutral-200 !px-3 !py-1 text-xs"
          >
            Add member
          </button>
        )}
      </div>
      <div className="p-5 space-y-4">
        {!canManage && (
          <div className="text-xs text-neutral-500">Only the owner can manage team members.</div>
        )}
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        {notice && (
          <div className="border border-green-200 bg-green-50 text-green-700 text-sm px-3 py-2">
            {notice}
          </div>
        )}

        {showForm && canManage && (
          <form onSubmit={onCreate} className="border border-neutral-200 p-4 space-y-3 bg-neutral-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input mt-1.5"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input
                  type="text"
                  className="input mt-1.5"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="label">Name (optional)</label>
                <input
                  className="input mt-1.5"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <input
                  list="role-suggestions"
                  className="input mt-1.5"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                />
                <datalist id="role-suggestions">
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <div className="label mb-2">Permissions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_LABELS.map((p) => (
                  <label
                    key={p.key}
                    className={`flex items-start gap-2 border border-neutral-200 px-3 py-2 cursor-pointer bg-white ${
                      newPerms[p.key] ? '!bg-neutral-100' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={newPerms[p.key]}
                      onChange={(e) => setNewPerms({ ...newPerms, [p.key]: e.target.checked })}
                    />
                    <span>
                      <span className="block text-sm font-medium text-neutral-900">{p.label}</span>
                      <span className="block text-[11px] text-neutral-500">{p.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Adding…' : 'Add member'}
              </button>
              <button
                type="button"
                className="btn-ghost !border !border-neutral-200"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              You set the password. Share the email and password with them out-of-band (text, in person) — they can change it later from their own Settings.
            </p>
          </form>
        )}

        {loading ? (
          <div className="text-sm text-neutral-500">Loading team…</div>
        ) : (
          <div className="divide-y divide-neutral-200 border border-neutral-200">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canManage={canManage && m.role !== 'OWNER'}
                onUpdate={(patch) => onUpdate(m, patch)}
                onDelete={() => onDelete(m)}
                onResetPassword={() => onResetPassword(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
  onUpdate,
  onDelete,
  onResetPassword,
}: {
  member: TeamMember;
  canManage: boolean;
  onUpdate: (patch: Partial<TeamMember>) => void;
  onDelete: () => void;
  onResetPassword: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(member.name || '');
  const [roleLabel, setRoleLabel] = useState(member.roleLabel || '');
  const [perms, setPerms] = useState<AuthPermissions>(member.permissions);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onUpdate({
        name: name.trim() || null,
        roleLabel: roleLabel.trim() || null,
        permissions: perms,
      });
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-900 truncate">
            {member.name || member.email}
          </div>
          <div className="text-xs text-neutral-500 truncate">
            {member.email}
            {member.roleLabel && <> · {member.roleLabel}</>}
            {member.role === 'OWNER' && <> · Owner</>}
          </div>
        </div>
        {canManage ? (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              className="btn-ghost !border !border-neutral-200 !px-3 !py-1 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Close' : 'Edit'}
            </button>
            <button
              type="button"
              className="btn-ghost !border !border-neutral-200 !px-3 !py-1 text-xs"
              onClick={onResetPassword}
            >
              Reset password
            </button>
            <button
              type="button"
              className="btn-ghost !border !border-red-200 text-red-700 !px-3 !py-1 text-xs"
              onClick={onDelete}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-neutral-400 shrink-0">
            {member.role === 'OWNER' ? 'Full access' : 'Managed by owner'}
          </div>
        )}
      </div>
      {expanded && canManage && (
        <div className="mt-3 border-t border-neutral-200 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input className="input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Role</label>
              <input
                className="input mt-1.5"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="label mb-2">Permissions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_LABELS.map((p) => (
                <label
                  key={p.key}
                  className={`flex items-start gap-2 border border-neutral-200 px-3 py-2 cursor-pointer ${
                    perms[p.key] ? 'bg-neutral-50' : 'bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={perms[p.key]}
                    onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">{p.label}</span>
                    <span className="block text-[11px] text-neutral-500">{p.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn-ghost !border !border-neutral-200"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
