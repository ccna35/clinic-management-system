import {
  Calendar,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "./ui/button";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/calendar", label: "Calendar", icon: Calendar },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const navItems = isAdmin
    ? [
        ...baseNavItems,
        { to: "/receptionists", label: "Receptionists", icon: UserCog },
      ]
    : baseNavItems;
  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="app-shell-root animate-soft-in min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="app-shell-sidebar flex flex-col">
        <div className="flex h-16 items-center border-b border-slate-700/60 px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              ClinicOS
            </p>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-100">Operations</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100",
                ].join(" ")
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sticky bottom-0 border-t border-slate-700/50 bg-slate-900/90 px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-50">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="truncate text-sm font-semibold text-slate-100">
                {user?.name ?? "User"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="app-shell-main flex flex-col">
        <header className="app-shell-header sticky top-0 z-30 px-4 py-3 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Today
              </p>
              <h2 className="text-lg font-semibold text-slate-900">{today}</h2>
            </div>
            <p className="text-sm text-slate-500">Clinic operations workspace</p>
          </div>
        </header>

        <section className="px-4 pb-6 pt-4 lg:px-7 lg:pb-8 lg:pt-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
