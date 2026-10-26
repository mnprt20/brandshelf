/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SessionContext, CustomerSessionContext } from "./types";
import { defaultRepository } from "./repository/storage";
import { AuthService } from "./services/authService";
import { CustomerService } from "./services/customerService";
import { testConnection, auth } from "./services/firebase";

import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { FranchiseSignupPage } from "./pages/FranchiseSignupPage";
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

export default function App() {
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash || "#/");
  const [session, setSession] = useState<SessionContext | null>(null);
  const [customerSession, setCustomerSession] = useState<CustomerSessionContext | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Sync session state from Firebase Auth token claims
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult();
          const claims = idTokenResult.claims;
          if (claims.role === "owner" || claims.role === "staff") {
            setSession({
              userId: (claims.userId as string) || currentUser.uid,
              storeId: (claims.storeId as string) || "",
              role: claims.role as "owner" | "staff"
            });
          } else if (claims.role === "customer") {
            setCustomerSession({
              customerId: (claims.customerId as string) || currentUser.uid.replace(/^cust_/, ""),
              storeId: (claims.storeId as string) || "",
              name: (claims.name as string) || currentUser.displayName || "Customer",
              phone: (claims.phone as string) || ""
            });
          }
        } catch (e) {
          console.warn("Error deriving claims from token:", e);
        }
      } else {
        setSession(null);
        setCustomerSession(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Verify Firestore connection on boot (client seed removed)
  useEffect(() => {
    const init = async () => {
      try {
        await testConnection();
      } catch (e) {
        console.warn("Firestore connection check:", e);
      }
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
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {}
    setSession(null);
    navigateTo("#/");
  };

  const handleCustomerLogin = (cSession: CustomerSessionContext) => {
    setCustomerSession(cSession);
  };

  const handleCustomerLogout = async () => {
    try {
      await auth.signOut();
    } catch {}
    setCustomerSession(null);
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
  if (segments[0] === "franchise-signup" || segments[0] === "signup-franchise") {
    return <FranchiseSignupPage onNavigate={navigateTo} onLoginSuccess={handleLoginSuccess} />;
  }
  if (segments[0] === "signup") {
    if (queryParams.get("plan") === "franchise") {
      return <FranchiseSignupPage onNavigate={navigateTo} onLoginSuccess={handleLoginSuccess} />;
    }
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

  // ROUTE 5: Diagnostics (blocked unless import.meta.env.DEV is true)
  if (segments[0] === "diagnostics") {
    if (!import.meta.env.DEV) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F8EF", padding: "24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px" }}>Diagnostics Unavailable</h2>
          <p style={{ color: "var(--color-muted)", marginBottom: "20px" }}>The test diagnostics suite is only accessible in development mode.</p>
          <button onClick={() => navigateTo("#/")} style={{ background: "var(--color-forest)", color: "#FFFFFF", padding: "10px 24px", borderRadius: "9999px", fontWeight: 600 }}>
            Back to Home
          </button>
        </div>
      );
    }
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
