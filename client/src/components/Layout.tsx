import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: IconGrid },
  { to: '/sales', label: 'Sales', icon: IconCart },
  { to: '/inventory', label: 'Inventory', icon: IconBox },
  { to: '/import', label: 'Import', icon: IconUpload },
  { to: '/chat', label: 'AI Assistant', icon: IconSpark },
  { to: '/settings', label: 'Settings', icon: IconGear },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/sales': 'Sales',
  '/inventory': 'Inventory',
  '/import': 'Import',
  '/chat': 'AI Assistant',
  '/settings': 'Settings',
};

const SIDEBAR_KEY = 'ai_sme_sidebar_collapsed';

export function Layout() {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitles[location.pathname] || '';

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_KEY) === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const userInitial = user?.email.charAt(0).toUpperCase() || '·';
  const businessInitial = business?.name.charAt(0).toUpperCase() || 'A';

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${collapsed ? 'md:w-16' : 'md:w-60'}
          w-60
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          shrink-0 bg-neutral-950 text-white flex flex-col
          border-r border-neutral-900
          transition-[width,transform] duration-200 ease-out
        `}
      >
        <div
          className={`border-b border-neutral-800 flex items-center ${
            collapsed ? 'md:justify-center md:px-0' : 'px-5'
          } justify-between px-5 py-4`}
        >
          {collapsed ? (
            <div className="hidden md:flex h-7 w-7 items-center justify-center border border-neutral-700 text-xs font-bold">
              {businessInitial}
            </div>
          ) : null}
          <div className={collapsed ? 'md:hidden' : ''}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">AI-SME</div>
            <div className="font-semibold text-sm mt-1 truncate max-w-[160px]">
              {business?.name || '—'}
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-neutral-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <IconX />
          </button>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 text-sm font-medium transition-colors
                 ${collapsed ? 'md:justify-center md:px-0' : ''}
                 px-4 py-2.5
                 ${
                   isActive
                     ? 'bg-neutral-800 text-white border-l-2 border-white'
                     : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border-l-2 border-transparent'
                 }`
              }
            >
              <Icon />
              <span className={collapsed ? 'md:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div
          className={`border-t border-neutral-800 ${
            collapsed ? 'md:p-2' : ''
          } p-4`}
        >
          {collapsed ? (
            <div className="hidden md:flex flex-col items-center gap-2">
              <div
                className="h-8 w-8 bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center"
                title={user?.email}
              >
                {userInitial}
              </div>
              <button
                type="button"
                title="Sign out"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-neutral-400 hover:text-white p-1"
                aria-label="Sign out"
              >
                <IconLogout />
              </button>
            </div>
          ) : null}
          <div className={collapsed ? 'md:hidden' : ''}>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Signed in</div>
            <div className="text-sm font-medium mt-1 truncate">{user?.email}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{user?.role}</div>
            <button
              type="button"
              className="mt-3 w-full text-left text-sm text-neutral-400 hover:text-white transition-colors"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              → Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-neutral-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="md:hidden btn-ghost !px-2 !py-2 !border !border-neutral-200"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
            <button
              type="button"
              className="hidden md:inline-flex btn-ghost !px-2 !py-2 !border !border-neutral-200"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
            </button>
            <h1 className="text-base md:text-xl font-semibold tracking-tight text-neutral-900 truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="chip hidden sm:inline-flex">{business?.currency}</span>
            <span className="text-xs text-neutral-500 hidden md:block truncate max-w-[180px]">
              {business?.name}
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-6 lg:px-8 py-4 md:py-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
