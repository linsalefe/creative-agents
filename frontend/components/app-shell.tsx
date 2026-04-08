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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  iconColor: string;
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
        iconColor: "text-blue-500",
      },
      {
        label: "Chat IA",
        href: "/chat",
        icon: MessageCircle,
        iconColor: "text-violet-500",
      },
      {
        label: "Variacoes",
        href: "/variacoes",
        icon: Layers,
        iconColor: "text-amber-500",
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
        iconColor: "text-emerald-500",
        matchExact: true,
      },
      {
        label: "Favoritos",
        href: "/biblioteca?favorito=true",
        icon: Heart,
        iconColor: "text-rose-500",
        matchQuery: { favorito: "true" },
      },
    ],
  },
  {
    title: "Sistema",
    adminOnly: true,
    items: [
      {
        label: "Configuracoes",
        href: "/configuracoes",
        icon: Settings,
        iconColor: "text-slate-400",
      },
      {
        label: "Usuarios",
        href: "/usuarios",
        icon: Users,
        iconColor: "text-gray-400",
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
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        {/* Active accent bar */}
        {active && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
            active ? item.iconColor : "text-muted-foreground",
            !active && "group-hover:" + item.iconColor
          )}
        />

        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate"
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Creative Machine
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              by CENAT
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
                <h4 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                </h4>
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
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
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
              "flex items-center gap-3 rounded-lg px-3 py-2",
              collapsed && "justify-center px-0"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {user.email}
                </span>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={logout}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-red-400"
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
