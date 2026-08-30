"use client";

import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  CalendarRange,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MailWarning,
  Megaphone,
  Menu,
  Network,
  QrCode,
  RefreshCcw,
  ScrollText,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Core",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/users", label: "Users", icon: UserCog },
      { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
    ],
  },
  {
    title: "School Administration",
    items: [
      {
        href: "/dashboard/admin/school",
        label: "School Profile",
        icon: Building2,
      },
      {
        href: "/dashboard/admin/sessions",
        label: "Academic Sessions",
        icon: CalendarRange,
      },
      { href: "/dashboard/admin/terms", label: "Terms", icon: GraduationCap },
      {
        href: "/dashboard/admin/departments",
        label: "Departments",
        icon: Network,
      },
      { href: "/dashboard/admin/classes", label: "Classes", icon: School },
      { href: "/dashboard/admin/subjects", label: "Subjects", icon: BookOpen },
      { href: "/dashboard/admin/timetable", label: "Timetable", icon: Table2 },
      {
        href: "/dashboard/admin/announcements",
        label: "Announcements",
        icon: Megaphone,
      },
      {
        href: "/dashboard/admin/audit-logs",
        label: "Audit Logs",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Student Records",
    items: [
      {
        href: "/dashboard/students",
        label: "Students",
        icon: Users,
      },
      {
        href: "/dashboard/teachers",
        label: "Teachers",
        icon: UsersRound,
      },
      {
        href: "/dashboard/student-records/guardians",
        label: "Guardians",
        icon: UserCog,
      },
      {
        href: "/dashboard/student-records/transfers",
        label: "Transfers",
        icon: RefreshCcw,
      },
      {
        href: "/dashboard/student-records/promotions",
        label: "Promotions",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Attendance",
    items: [
      {
        href: "/dashboard/attendance",
        label: "Attendance Dashboard",
        icon: Activity,
      },
      {
        href: "/dashboard/attendance/students",
        label: "Student Attendance",
        icon: Users,
      },
      {
        href: "/dashboard/attendance/teachers",
        label: "Teacher Attendance",
        icon: UsersRound,
      },
      {
        href: "/dashboard/attendance/qr",
        label: "QR Attendance",
        icon: QrCode,
      },
      {
        href: "/dashboard/attendance/reports",
        label: "Reports & Export",
        icon: FileSpreadsheet,
      },
      {
        href: "/dashboard/attendance/alerts",
        label: "Alerts & Notifications",
        icon: BellRing,
      },
    ],
  },
  {
    title: "Learning Management",
    items: [
      {
        href: "/dashboard/lms",
        label: "LMS Overview",
        icon: BookOpen,
      },
      {
        href: "/dashboard/lms/courses",
        label: "Courses",
        icon: GraduationCap,
      },
      {
        href: "/dashboard/lms/certificates",
        label: "Certificates",
        icon: Award,
      },
    ],
  },
  {
    title: "Computer Based Test",
    items: [
      {
        href: "/dashboard/cbt",
        label: "CBT Overview",
        icon: FileSpreadsheet,
      },
      {
        href: "/dashboard/cbt/questions",
        label: "Question Bank",
        icon: BookOpen,
      },
      {
        href: "/dashboard/cbt/exams",
        label: "Exams",
        icon: GraduationCap,
      },
      {
        href: "/dashboard/cbt/attempts",
        label: "Attempts & Results",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Result Processing",
    items: [
      {
        href: "/dashboard/results",
        label: "Results Overview",
        icon: FileSpreadsheet,
      },
      {
        href: "/dashboard/results/broadsheet",
        label: "Broadsheet",
        icon: Table2,
      },
      {
        href: "/dashboard/results/scales",
        label: "Grading Scales",
        icon: Award,
      },
      {
        href: "/dashboard/results/report-cards",
        label: "Report Cards",
        icon: ScrollText,
      },
      {
        href: "/dashboard/results/transcripts",
        label: "Transcripts",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        href: "/dashboard/finance",
        label: "Finance Dashboard",
        icon: BarChart3,
      },
      {
        href: "/dashboard/finance/fee-structure",
        label: "Fee Structure",
        icon: FileSpreadsheet,
      },
      {
        href: "/dashboard/finance/invoices",
        label: "Invoices",
        icon: ScrollText,
      },
      {
        href: "/dashboard/finance/outstanding",
        label: "Outstanding Fees",
        icon: AlertTriangle,
      },
      {
        href: "/dashboard/finance/payments",
        label: "Payments & Receipts",
        icon: QrCode,
      },
      {
        href: "/dashboard/finance/discounts",
        label: "Discounts & Scholarships",
        icon: Award,
      },
    ],
  },
  {
    title: "Parent Portal",
    items: [
      {
        href: "/dashboard/parent",
        label: "My Children",
        icon: Users,
      },
      {
        href: "/dashboard/parent/messages",
        label: "Teacher Messages",
        icon: MailWarning,
      },
      {
        href: "/dashboard/parent/announcements",
        label: "Announcements",
        icon: Megaphone,
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        href: "/dashboard/analytics",
        label: "Enterprise Dashboards",
        icon: BarChart3,
      },
      { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "AI Services",
    items: [
      {
        href: "/dashboard/ai",
        label: "AI Console",
        icon: Sparkles,
      },
      {
        href: "/dashboard/ai/templates",
        label: "Prompt Templates",
        icon: ScrollText,
      },
      {
        href: "/dashboard/ai/usage",
        label: "Usage & Logs",
        icon: Activity,
      },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    tenants,
    activeTenant,
    loading,
    logout,
    switchTenant,
    setActiveTenant,
  } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  async function handleTenantChange(slug: string) {
    if (slug === activeTenant?.slug) return;
    setSwitching(true);
    try {
      if (tenants.some((t) => t.slug === slug)) {
        const target = tenants.find((t) => t.slug === slug);
        if (target) await switchTenant(slug);
      }
    } catch {
      const fallback = tenants.find((t) => t.slug === slug);
      if (fallback) setActiveTenant(fallback);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">EduOS</span>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-sm font-semibold">
              {activeTenant?.name ?? user.email}
            </span>
            {activeTenant?.plan && (
              <Badge variant="secondary">{activeTenant.plan}</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm transition-colors hover:bg-accent md:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <ThemeToggle />
            {tenants.length > 1 && (
              <select
                aria-label="Switch tenant"
                value={activeTenant?.slug ?? ""}
                disabled={switching}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.slug}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 md:p-6">
          {user.emailVerifiedAt === null && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 font-medium">
                <MailWarning className="h-4 w-4" />
                Your email address is not verified yet.
              </p>
              <Link
                href="/dashboard/security"
                className="text-xs font-semibold underline underline-offset-2"
              >
                Verify now
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-background shadow-xl transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">EduOS</span>
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav className="h-[calc(100%-3.5rem)] space-y-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
