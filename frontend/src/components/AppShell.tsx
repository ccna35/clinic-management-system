import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "./ui/button";

const baseNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
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
    <div className="animate-soft-in min-h-screen lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="flex flex-col bg-gray-900 text-white">
        <div className="flex items-center justify-center h-16 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wide">ClinicOS</h1>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium transition relative",
                  isActive
                    ? "bg-gray-800 text-blue-400 border-r-4 border-blue-400"
                    : "hover:bg-gray-800 hover:text-blue-300",
                ].join(" ")
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sticky bottom-0 px-4 py-4 bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Welcome,</p>
              <p className="text-sm font-semibold truncate">
                {user?.name ?? "User"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full border-gray-700 bg-transparent text-gray-300 hover:bg-gray-700"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex flex-col bg-gray-100">
        <header className="sticky top-0 z-30 border-b border-gray-300 bg-white px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today</p>
              <h2 className="text-lg font-bold text-gray-800">{today}</h2>
            </div>
            <p className="text-sm text-gray-400">Clinic Operations Dashboard</p>
          </div>
        </header>

        <section className="p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
