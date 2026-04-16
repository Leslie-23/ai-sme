import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sales', label: 'Sales' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/chat', label: 'AI Chat' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  const { user, business, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="font-bold text-lg text-brand-700">AI-SME</div>
          <nav className="flex gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="text-xs text-slate-500 text-right">
            <div className="font-medium text-slate-700">{business?.name}</div>
            <div>{user?.email}</div>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
