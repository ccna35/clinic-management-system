import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const PatientsPage = lazy(() =>
  import("./pages/PatientsPage").then((module) => ({
    default: module.PatientsPage,
  })),
);
const DoctorsPage = lazy(() =>
  import("./pages/DoctorsPage").then((module) => ({
    default: module.DoctorsPage,
  })),
);
const AppointmentsPage = lazy(() =>
  import("./pages/AppointmentsPage").then((module) => ({
    default: module.AppointmentsPage,
  })),
);
const PatientDetailsPage = lazy(() => import("./pages/PatientDetailsPage"));
const ReceptionistsPage = lazy(() => import("./pages/ReceptionistsPage"));

function RouteFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
        <p className="text-sm text-slate-600">Loading view...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:id" element={<PatientDetailsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/receptionists" element={<ReceptionistsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
