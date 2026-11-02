import { BarChart3, CalendarDays, CircleHelp, FileText, GraduationCap, Home, LogOut, Menu, MessageSquare, Network } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tutor", label: "AI Tutor", icon: MessageSquare },
  { to: "/agents", label: "Multi-Agent Studio", icon: Network },
  { to: "/materials", label: "Study Materials", icon: FileText },
  { to: "/quiz", label: "Quiz Studio", icon: CircleHelp },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen">
      {open && <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface p-3 transition-transform md:static md:translate-x-0 ${open ? "" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-3 pb-4 pt-2 font-semibold"><GraduationCap size={20} className="text-accent" /> StudyMind AI</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-soft text-accent" : "text-muted hover:bg-canvas hover:text-ink"}`}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between rounded-lg border-t border-line px-3 pt-3 text-sm">
          <div className="min-w-0"><div className="truncate font-medium">{user?.name}</div><div className="truncate text-xs text-muted">{user?.email}</div></div>
          <button onClick={signOut} title="Sign out" className="rounded p-1.5 text-muted hover:bg-canvas hover:text-ink"><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex h-12 items-center border-b border-line bg-surface px-4 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        </div>
        <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8"><Outlet /></div>
      </main>
    </div>
  );
}
