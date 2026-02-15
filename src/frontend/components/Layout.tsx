import { NavLink } from 'react-router-dom';

const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  watchlist: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logo: (
    <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
      <rect className="fill-cyan-500" x="4" y="4" width="10" height="10" rx="2" opacity="0.9" />
      <rect className="fill-cyan-400" x="18" y="4" width="10" height="10" rx="2" opacity="0.7" />
      <rect className="fill-cyan-400" x="4" y="18" width="10" height="10" rx="2" opacity="0.7" />
      <rect className="fill-cyan-300" x="18" y="18" width="10" height="10" rx="2" opacity="0.5" />
    </svg>
  ),
};

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function NavItem({ to, label, icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'text-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(6,182,212,0.2)]'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
        }`
      }
    >
      <span className={`transition-transform duration-200 group-hover:scale-110`}>
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const navItems: NavItemProps[] = [
    { to: '/', label: '仪表盘', icon: Icons.dashboard },
    { to: '/search', label: '搜索', icon: Icons.search },
    { to: '/watchlist', label: '监控列表', icon: Icons.watchlist },
    { to: '/settings', label: '设置', icon: Icons.settings },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c10]">
      <header className="sticky top-0 z-[100] bg-[#11141a]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                {Icons.logo}
                <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  永劫无间
                </h1>
                <span className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase">
                  藏宝阁监控
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>

            <button 
              className="md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => {
                const mobileNav = document.getElementById('mobile-nav');
                mobileNav?.classList.toggle('hidden');
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <nav id="mobile-nav" className="hidden md:hidden border-t border-slate-800/50 bg-[#11141a]/95">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`
                }
                onClick={() => {
                  const mobileNav = document.getElementById('mobile-nav');
                  mobileNav?.classList.add('hidden');
                }}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      <footer className="border-t border-slate-800/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>永劫无间藏宝阁监控系统 v1.0</span>
            <span>数据来源: 网易藏宝阁</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
