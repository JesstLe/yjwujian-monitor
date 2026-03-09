import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Icons = {
  dashboard: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  search: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  watchlist: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  settings: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  compare: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  battleRecords: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5-5l-8 8-4-4"
      />
    </svg>
  ),
  logo: (
    <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
      <rect
        className="fill-blue-600"
        x="4"
        y="4"
        width="10"
        height="10"
        rx="2"
        opacity="0.9"
      />
      <rect
        className="fill-blue-500"
        x="18"
        y="4"
        width="10"
        height="10"
        rx="2"
        opacity="0.8"
      />
      <rect
        className="fill-blue-500"
        x="4"
        y="18"
        width="10"
        height="10"
        rx="2"
        opacity="0.7"
      />
      <rect
        className="fill-blue-400"
        x="18"
        y="18"
        width="10"
        height="10"
        rx="2"
        opacity="0.6"
      />
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
        `group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
          ? "text-blue-600 bg-blue-50"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`
      }
    >
      <span className="transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems: NavItemProps[] = [
    { to: "/", label: "仪表盘", icon: Icons.dashboard },
    { to: "/search", label: "搜索", icon: Icons.search },
    { to: "/watchlist", label: "监控列表", icon: Icons.watchlist },
    { to: "/compare", label: "对比", icon: Icons.compare },
    { to: "/settings", label: "设置", icon: Icons.settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-[100] bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {Icons.logo}
              <div className="flex flex-col">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight">
                  永劫无间
                </h1>
                <span className="text-[10px] text-blue-600 font-medium tracking-wider uppercase">
                  藏宝阁助手
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </nav>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {user?.username || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  退出
                </button>
              </div>
            </div>

            <button
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => {
                const mobileNav = document.getElementById("mobile-nav");
                mobileNav?.classList.toggle("hidden");
              }}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          className="hidden md:hidden border-t border-gray-100 bg-white"
        >
          <div className="px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
                onClick={() => {
                  const mobileNav = document.getElementById("mobile-nav");
                  mobileNav?.classList.add("hidden");
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
        <div className="animate-fade-in">{children}</div>
      </main>

      <footer className="border-t border-gray-200 mt-auto bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500">
            <span>本项目仅供学习交流使用，与任何官方平台无关</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
