import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "./ui/button";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const today = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="animate-soft-in min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-200 bg-slate-900 px-4 py-5 text-slate-100 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex h-full flex-col">
          <div className="rounded-md border border-slate-700 bg-slate-800 p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-300">
              Clinic OS
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white">
              Reception Suite
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Operational workspace for daily patient flow
            </p>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2 lg:flex-col">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white",
                  ].join(" ")
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-5 rounded-md border border-slate-700 bg-slate-800 p-3 lg:mt-auto">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-blue-700" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  Signed in as
                </p>
                <p className="truncate text-sm font-semibold text-slate-100">
                  {user?.name ?? "User"}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-slate-600 bg-transparent text-slate-100 hover:bg-slate-700"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col bg-slate-100">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-2.5 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
                Today
              </p>
              <strong className="text-sm text-slate-900">{today}</strong>
            </div>
            <p className="text-xs text-slate-500">
              Clinic operations dashboard
            </p>
          </div>
        </header>

        <section className="p-4 lg:p-8">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
