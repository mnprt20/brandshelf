/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SessionContext, CustomerSessionContext } from "./types";
import { defaultRepository } from "./repository/storage";
import { seedDemoData } from "./services/seedData";
import { AuthService } from "./services/authService";
import { CustomerService } from "./services/customerService";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ThemesGalleryPage } from "./pages/ThemesGalleryPage";
import { ThemePreviewPage } from "./pages/ThemePreviewPage";
import { StorefrontPage } from "./pages/StorefrontPage";
import { AdminPage } from "./pages/AdminPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";

import { DashboardLayout } from "./pages/dashboard/DashboardLayout";
import { OverviewTab } from "./pages/dashboard/OverviewTab";
import { ProductsTab } from "./pages/dashboard/ProductsTab";
import { CategoriesTab } from "./pages/dashboard/CategoriesTab";
import { OrdersTab } from "./pages/dashboard/OrdersTab";
import { QrStandsTab } from "./pages/dashboard/QrStandsTab";
import { StaffTab } from "./pages/dashboard/StaffTab";
import { ReportsTab } from "./pages/dashboard/ReportsTab";
import { SettingsTab } from "./pages/dashboard/SettingsTab";
import { AiAssistantTab } from "./pages/dashboard/AiAssistantTab";

const SESSION_STORAGE_KEY = "mintshelf_active_session";
const CUSTOMER_SESSION_STORAGE_KEY = "mintshelf_customer_session";

export default function App() {
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || "#/");
  const [session, setSession] = useState<SessionContext | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [customerSession, setCustomerSession] = useState<CustomerSessionContext | null>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [initialized, setInitialized] = useState(false);

  // Initialize seed demo data on first load
  useEffect(() => {
    const init = async () => {
      await seedDemoData(defaultRepository);
      setInitialized(true);
    };
    init();

    const handleHashChange = () => {
      setCurrentHash(window.location.hash || "#/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (route: string) => {
    window.location.hash = route;
    setCurrentHash(route);
  };

  const handleLoginSuccess = (newSession: SessionContext) => {
    setSession(newSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch {}
  };

  const handleLogout = () => {
    setSession(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    navigateTo("#/");
  };

  const handleCustomerLogin = (cSession: CustomerSessionContext) => {
    setCustomerSession(cSession);
    try {
      localStorage.setItem(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(cSession));
    } catch {}
  };

  const handleCustomerLogout = () => {
    setCustomerSession(null);
    try {
      localStorage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    } catch {}
  };

  // Quick Demo Login helper for 4 personas
  const handleQuickLogin = async (type: "bakery_owner" | "cafe_owner" | "cafe_staff" | "mart_customer") => {
    const authService = new AuthService(defaultRepository);
    const customerService = new CustomerService(defaultRepository);

    try {
      if (type === "bakery_owner") {
        const { user, memberships } = await authService.login("bakery_owner", "pass123");
        handleLoginSuccess({ userId: user.id, storeId: memberships[0].storeId, role: memberships[0].role });
        navigateTo("#/dashboard/overview");
      } else if (type === "cafe_owner") {
        const { user, memberships } = await authService.login("cafe_owner", "pass123");
        handleLoginSuccess({ userId: user.id, storeId: memberships[0].storeId, role: memberships[0].role });
        navigateTo("#/dashboard/overview");
      } else if (type === "cafe_staff") {
        const { user, memberships } = await authService.login("cafe_staff", "pass");
        handleLoginSuccess({ userId: user.id, storeId: memberships[0].storeId, role: memberships[0].role });
        navigateTo("#/dashboard/overview");
      } else if (type === "mart_customer") {
        const martStore = await defaultRepository.getStoreBySlug("demo-online-mart");
        if (martStore) {
          const cust = await customerService.login(martStore.id, "9988776655", "pass123");
          handleCustomerLogin({ customerId: cust.id, storeId: martStore.id, name: cust.name, phone: cust.phone });
          navigateTo(`#/store/${martStore.slug}`);
        }
      }
    } catch (err: any) {
      alert("Quick login failed: " + err.message);
    }
  };

  if (!initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F8EF" }}>
        <p style={{ color: "var(--color-forest)", fontWeight: 600 }}>Starting MintShelf...</p>
      </div>
    );
  }

  // Parse Hash
  const rawHash = currentHash.replace(/^#\/?/, "");
  const [routePath, queryString] = rawHash.split("?");
  const queryParams = new URLSearchParams(queryString || "");
  const refCode = queryParams.get("ref") || undefined;
  const segments = routePath.split("/").filter(Boolean);

  // ROUTE 1: Landing
  if (segments.length === 0 || segments[0] === "") {
    return <LandingPage onNavigate={navigateTo} onQuickLogin={handleQuickLogin} />;
  }

  // ROUTE 2: Auth
  if (segments[0] === "login") {
    return <LoginPage onNavigate={navigateTo} onLoginSuccess={handleLoginSuccess} />;
  }
  if (segments[0] === "signup") {
    return <SignupPage onNavigate={navigateTo} onLoginSuccess={handleLoginSuccess} />;
  }

  // ROUTE 3: Themes
  if (segments[0] === "themes") {
    if (segments[1]) {
      return <ThemePreviewPage themeKey={segments[1]} onNavigate={navigateTo} />;
    }
    return <ThemesGalleryPage onNavigate={navigateTo} />;
  }

  // ROUTE 4: Admin Platform
  if (segments[0] === "admin") {
    return (
      <AdminPage
        onNavigate={navigateTo}
        onSelectStoreSession={(storeId, userId, role) => {
          handleLoginSuccess({ storeId, userId, role });
        }}
      />
    );
  }

  // ROUTE 5: Diagnostics
  if (segments[0] === "diagnostics") {
    return <DiagnosticsPage onNavigate={navigateTo} />;
  }

  // ROUTE 6: Storefront (#/store/:slug or #/store/:slug/order/:orderNumber)
  if (segments[0] === "store") {
    const slug = segments[1] || "demo-bakery";
    const orderNumber = segments[2] === "order" ? segments[3] : undefined;

    return (
      <StorefrontPage
        slug={slug}
        orderNumber={orderNumber}
        referralCode={refCode}
        customerSession={customerSession}
        onCustomerLogin={handleCustomerLogin}
        onCustomerLogout={handleCustomerLogout}
        onNavigate={navigateTo}
      />
    );
  }

  // ROUTE 7: Dashboard (#/dashboard/...)
  if (segments[0] === "dashboard") {
    if (!session) {
      return <LoginPage onNavigate={navigateTo} onLoginSuccess={handleLoginSuccess} />;
    }

    const subroute = segments[1] || "overview";

    let content: React.ReactNode = null;
    if (subroute === "overview") content = <OverviewTab session={session} onNavigate={navigateTo} />;
    else if (subroute === "products") content = <ProductsTab session={session} />;
    else if (subroute === "categories") content = <CategoriesTab session={session} />;
    else if (subroute === "orders") content = <OrdersTab session={session} />;
    else if (subroute === "qr-stands") content = <QrStandsTab session={session} />;
    else if (subroute === "staff") content = <StaffTab session={session} />;
    else if (subroute === "reports") content = <ReportsTab session={session} />;
    else if (subroute === "settings") content = <SettingsTab session={session} />;
    else if (subroute === "ai-assistant") content = <AiAssistantTab session={session} />;
    else content = <OverviewTab session={session} onNavigate={navigateTo} />;

    return (
      <DashboardLayout
        session={session}
        currentSubroute={subroute}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      >
        {content}
      </DashboardLayout>
    );
  }

  // Fallback
  return <LandingPage onNavigate={navigateTo} onQuickLogin={handleQuickLogin} />;
}
