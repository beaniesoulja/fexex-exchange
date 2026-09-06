"use client";
import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Analytics, Order, Pricing, SupportTicketSummary } from "./admin-types";

interface AdminContextValue {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  ordersLoading: boolean;
  pricing: Pricing | null;
  setPricing: Dispatch<SetStateAction<Pricing | null>>;
  pricingLoadError: string;
  analytics: Analytics | null;
  analyticsError: string;
  fetchAnalytics: () => Promise<void>;
  supportTickets: SupportTicketSummary[];
  setSupportTickets: Dispatch<SetStateAction<SupportTicketSummary[]>>;
  fetchSupportTickets: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pricingLoadError, setPricingLoadError] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketSummary[]>([]);

  const fetchSupportTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support");
      if (!res.ok) throw new Error("Failed to load support tickets");
      setSupportTickets(await res.json());
    } catch (error) {
      console.error("Failed to fetch support tickets", error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      setAnalytics(await res.json());
      setAnalyticsError("");
    } catch (error) {
      console.error("Failed to fetch analytics", error);
      setAnalyticsError("We could not load user activity right now.");
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    void fetch("/api/admin/orders")
      .then((res) => res.json())
      .then(setOrders)
      .catch((error) => console.error("Failed to fetch orders", error))
      .finally(() => setOrdersLoading(false));
    void fetch("/api/admin/pricing")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load pricing");
        return res.json();
      })
      .then(setPricing)
      .catch((error) => {
        console.error("Failed to fetch pricing", error);
        setPricingLoadError("We could not load the current pricing.");
      });
    void fetch("/api/admin/analytics")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then(setAnalytics)
      .catch((error) => {
        console.error("Failed to fetch analytics", error);
        setAnalyticsError("We could not load user activity right now.");
      });
    void fetch("/api/admin/support")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load support tickets");
        return res.json();
      })
      .then(setSupportTickets)
      .catch((error) => console.error("Failed to fetch support tickets", error));
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    let ordersInFlight = false;
    let analyticsInFlight = false;
    let supportInFlight = false;
    const refreshSupportTickets = () => {
      if (document.visibilityState !== "visible" || supportInFlight) return;
      supportInFlight = true;
      void fetch("/api/admin/support")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load support tickets");
          return res.json();
        })
        .then(setSupportTickets)
        .catch((error) => console.error("Failed to refresh support tickets", error))
        .finally(() => { supportInFlight = false; });
    };
    const refreshOrders = () => {
      if (document.visibilityState !== "visible" || ordersInFlight) return;
      ordersInFlight = true;
      void fetch("/api/admin/orders")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load orders");
          return res.json();
        })
        .then(setOrders)
        .catch((error) => console.error("Failed to refresh orders", error))
        .finally(() => { ordersInFlight = false; });
    };

    const refreshAnalytics = () => {
      if (document.visibilityState !== "visible" || analyticsInFlight) return;
      analyticsInFlight = true;
      void fetch("/api/admin/analytics")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load analytics");
          return res.json();
        })
        .then(setAnalytics)
        .catch((error) => {
          console.error("Failed to refresh analytics", error);
          setAnalyticsError("We could not load user activity right now.");
        })
        .finally(() => { analyticsInFlight = false; });
    };

    const ordersInterval = window.setInterval(refreshOrders, 15_000);
    const analyticsInterval = window.setInterval(refreshAnalytics, 60_000);
    const supportInterval = window.setInterval(refreshSupportTickets, 15_000);
    const onVisibilityChange = () => {
      refreshOrders();
      refreshAnalytics();
      refreshSupportTickets();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(ordersInterval);
      window.clearInterval(analyticsInterval);
      window.clearInterval(supportInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, session]);

  return (
    <AdminContext.Provider value={{ orders, setOrders, ordersLoading, pricing, setPricing, pricingLoadError, analytics, analyticsError, fetchAnalytics, supportTickets, setSupportTickets, fetchSupportTickets }}>
      {children}
    </AdminContext.Provider>
  );
}
