"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  MessageCircle,
  Layers,
  ImageIcon,
  Heart,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";

/* ================================================================
   Sidebar Context
   ================================================================ */

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggleCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

/* ================================================================
   Menu Definition
   ================================================================ */

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  matchExact?: boolean;
  matchQuery?: Record<string, string>;
}

interface MenuGroup {
  title: string;
  adminOnly?: boolean;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "Principal",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
      },
      {
        label: "Chat IA",
        href: "/chat",
        icon: MessageCircle,
        color: "text-violet-400",
        bg: "bg-violet-500/10",
      },
      {
        label: "Variações",
        href: "/variacoes",
        icon: Layers,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
      },
    ],
  },
  {
    title: "Biblioteca",
    items: [
      {
        label: "Artes",
        href: "/biblioteca",
        icon: ImageIcon,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        matchExact: true,
      },
      {
        label: "Favoritos",
        href: "/biblioteca?favorito=true",
        icon: Heart,
        color: "text-pink-400",
        bg: "bg-pink-500/10",
        matchQuery: { favorito: "true" },
      },
    ],
  },
  {
    title: "Sistema",
    adminOnly: true,
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        icon: Settings,
        color: "text-gray-400",
        bg: "bg-gray-500/10",
      },
      {
        label: "Usuários",
        href: "/usuarios",
        icon: Users,
        color: "text-pink-400",
        bg: "bg-pink-500/10",
      },
    ],
  },
];

/* ================================================================
   Route Matching
   ================================================================ */

function useIsActive(item: MenuItem): boolean {
  const pathname = usePathname();

  if (item.matchQuery) {
    const base = item.href.split("?")[0];
    if (pathname !== base) return false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return Object.entries(item.matchQuery).every(
        ([k, v]) => params.get(k) === v
      );
    }
    return false;
  }

  if (item.matchExact) {
    if (pathname !== item.href) return false;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return !params.has("favorito");
    }
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/* ================================================================
   Tooltip (minimal, for collapsed sidebar icons)
   ================================================================ */

function Tooltip({
  children,
  label,
  enabled,
}: {
  children: React.ReactNode;
  label: string;
  enabled: boolean;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleEnter = useCallback(() => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    setShow(true);
  }, [enabled]);

  const handleLeave = useCallback(() => setShow(false), []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative"
    >
      {children}
      {show && enabled && (
        <div
          className="fixed z-[100] -translate-y-1/2 rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg border border-border pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Sidebar Menu Item
   ================================================================ */

function SidebarMenuItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: MenuItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = useIsActive(item);
  const Icon = item.icon;

  return (
    <Tooltip label={item.label} enabled={collapsed}>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
          active
            ? "sidebar-item-active text-white"
            : "text-gray-400 hover:bg-white/[0.04] hover:text-white",
          collapsed && "justify-center px-0"
        )}
      >
        {/* Icon wrapper with colored background */}
        <div className={cn("sidebar-icon-wrap shrink-0", active ? item.bg : "")}>
          <Icon
            className={cn(
              "w-[18px] h-[18px] transition-colors",
              active ? item.color : "text-muted-foreground/70"
            )}
            strokeWidth={active ? 2 : 1.75}
          />
        </div>

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex-1 truncate",
                active ? "font-medium text-white" : "text-gray-400"
              )}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </Tooltip>
  );
}

/* ================================================================
   Sidebar Content (shared between desktop & mobile)
   ================================================================ */

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="flex h-full flex-col">
      {/* ---- Logo ---- */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-5 py-5",
          collapsed && "justify-center px-3"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight text-white">
              Creative Machine
            </span>
            <span className="text-[10px] uppercase tracking-widest text-violet-300">
              BY CENAT
            </span>
          </div>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {menuGroups.map((group) => {
          if (group.adminOnly && user?.role !== "admin") return null;

          return (
            <div key={group.title}>
              {!collapsed && (
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground px-3 mb-2 block">
                  {group.title}
                </span>
              )}
              {collapsed && (
                <div className="mb-2 flex justify-center">
                  <div className="h-px w-6 bg-sidebar-border" />
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ---- Footer ---- */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Theme toggle */}
        <Tooltip label={theme === "dark" ? "Modo Claro" : "Modo Escuro"} enabled={collapsed}>
          <button
            onClick={toggleTheme}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-white",
              collapsed && "justify-center px-0"
            )}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <Moon className="h-[18px] w-[18px] shrink-0" />
            )}
            {!collapsed && (
              <span className="truncate">
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </span>
            )}
          </button>
        </Tooltip>

        {/* User area */}
        {user && (
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.03]",
              collapsed && "justify-center px-0"
            )}
          >
            <div className="h-9 w-9 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 text-xs font-bold shrink-0">
              {initials}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={logout}
                className="shrink-0 rounded-md p-1.5 text-gray-500 hover:text-white transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Logout button when collapsed (icon only) */}
        {user && collapsed && (
          <Tooltip label="Sair" enabled={collapsed}>
            <button
              onClick={logout}
              className="flex w-full items-center justify-center rounded-lg px-0 py-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-400"
              aria-label="Sair"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Desktop Sidebar
   ================================================================ */

function DesktopSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar"
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.aside>
  );
}

/* ================================================================
   Mobile Sheet (self-contained overlay + sliding panel)
   ================================================================ */

function MobileSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-sidebar-border bg-sidebar shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarContent collapsed={false} onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   Page Title Helper
   ================================================================ */

function usePageTitle(): string {
  const pathname = usePathname();

  const flat = menuGroups.flatMap((g) => g.items);
  const match = flat.find(
    (item) =>
      pathname === item.href ||
      pathname === item.href.split("?")[0] ||
      pathname.startsWith(item.href + "/")
  );

  return match?.label ?? "Creative Machine";
}

/* ================================================================
   AppShell (exported)
   ================================================================ */

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = usePageTitle();

  // Close mobile sheet on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <DesktopSidebar />}

      {/* Mobile sheet */}
      {isMobile && (
        <MobileSheet open={mobileOpen} onClose={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <motion.main
        initial={false}
        animate={{
          marginLeft: isMobile ? 0 : collapsed ? 64 : 280,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-1 flex-col min-h-screen overflow-y-auto"
      >
        {/* Mobile top bar */}
        {isMobile && (
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {pageTitle}
              </span>
            </div>
          </header>
        )}

        {/* Page content */}
        <div className="flex-1">{children}</div>
      </motion.main>
    </div>
  );
}
