import React, { useState, useEffect } from "react";
import { PROJECT_NAME, PLAN_PRICES, PLANS } from "../config/constants";
import { CurvedVideoCarousel } from "../components/CurvedVideoCarousel";
import { THEME_REGISTRY } from "../themes/registry";
import { HERO_CAROUSEL_PRODUCTS } from "../config/carouselProducts";

interface Props {
  onNavigate: (route: string) => void;
  onQuickLogin?: (type: "bakery_owner" | "cafe_owner" | "cafe_staff" | "mart_customer") => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const faqs = [
    { q: "Do I need technical skills?", a: "Not at all. You can add your products, choose a theme, and generate your store QR code in less than 5 minutes." },
    { q: "How do customers pay?", a: "Customers scan your store QR code or click your link, select their items, and pay you directly via your custom UPI QR code or cash." },
    { q: "Can staff see everything?", a: "No. Staff members can only see and manage their own sales and counter orders. They cannot change prices, edit catalogue items, or see other team members' data." },
    { q: "What happens when I outgrow a plan?", a: "You can seamlessly transition from Offline Catalogue to Franchise or Online App without losing any order history or product catalog data." },
    { q: "Is my data separate from other stores?", a: "Yes. Every store has strict tenant isolation at the service level, ensuring zero data leakage across shops." },
    { q: "Do I need a payment gateway?", a: "No payment gateway account or transaction fees are required. MintShelf operates with direct UPI QR code confirmation and optional cash-on-delivery." }
  ];

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      {/* SECTION 1: HERO */}
      {isMobile ? (
        /* Mobile-Native Optimized Hero (< 768px) */
        <section style={{ padding: "20px 16px 36px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {/* Mobile Header */}
          <header style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
            <div
              onClick={() => onNavigate("#/")}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM4 12C4 7.58 7.58 4 12 4C14.07 4 15.94 4.79 17.36 6.07L6.07 17.36C4.79 15.94 4 14.07 4 12ZM12 20C9.93 20 8.06 19.21 6.64 17.93L17.93 6.64C19.21 8.06 20 9.93 20 12C20 16.42 16.42 20 12 20Z" fill="var(--color-forest)"/>
              </svg>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-ink)", letterSpacing: "-0.03em" }}>{PROJECT_NAME}</span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => onNavigate("#/login")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  backgroundColor: "#FFFFFF",
                  color: "var(--color-forest)",
                  fontWeight: 600,
                  fontSize: "13px",
                  border: "1px solid #DCE3D6"
                }}
              >
                Log in
              </button>
              <button
                onClick={() => onNavigate("#/signup")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9999px",
                  backgroundColor: "var(--color-forest)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "13px"
                }}
              >
                Sign up
              </button>
            </div>
          </header>

          {/* Mint Badge */}
          <div
            style={{
              padding: "6px 14px",
              backgroundColor: "var(--color-mint)",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-forest)",
              marginBottom: "16px"
            }}
          >
            Built for small shops and franchises
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-headline)",
              fontSize: "36px",
              lineHeight: "40px",
              letterSpacing: "-0.03em",
              color: "var(--color-ink)",
              margin: "0 0 16px"
            }}
          >
            Turn Your Shelf into a Shareable Store
          </h1>

          {/* Subline */}
          <p style={{ fontSize: "16px", lineHeight: "24px", color: "var(--color-muted)", margin: "0 0 24px", maxWidth: "400px" }}>
            Add your products, pick a theme and share one QR code. Take orders from walk-in customers today, then grow into a team and an online app.
          </p>

          {/* Mobile Shelf Preview Cards Slider */}
          <div
            style={{
              width: "100%",
              display: "flex",
              gap: "12px",
              overflowX: "auto",
              padding: "8px 4px 16px",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {HERO_CAROUSEL_PRODUCTS.map((card, idx) => (
              <div
                key={idx}
                style={{
                  flexShrink: 0,
                  width: "220px",
                  background: "#FFFFFF",
                  borderRadius: "18px",
                  border: "1px solid #E5EADF",
                  overflow: "hidden",
                  textAlign: "left",
                  scrollSnapAlign: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ height: "140px", overflow: "hidden", position: "relative" }}>
                  <img src={card.image} alt={card.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.65)", color: "#FFFFFF", padding: "2px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: 600 }}>
                    {card.theme} Theme
                  </span>
                </div>
                <div style={{ padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--color-forest)", fontWeight: 700, textTransform: "uppercase" }}>{card.category}</div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-ink)", margin: "2px 0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-forest)" }}>{card.price}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{ width: "100%", maxWidth: "340px", marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => onNavigate("#/signup")}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "9999px",
                backgroundColor: "var(--color-forest)",
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 700,
                boxShadow: "0 6px 16px rgba(8, 72, 45, 0.25)"
              }}
            >
              Create my catalogue
            </button>

            <button
              onClick={() => onNavigate("#/franchise-signup")}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "9999px",
                backgroundColor: "#FFFFFF",
                color: "var(--color-forest)",
                border: "2px solid var(--color-forest)",
                fontSize: "15px",
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(8, 72, 45, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <span>🏢</span> Start my franchise ➔
            </button>
          </div>
        </section>
      ) : (
        /* Desktop Curved Hero (>= 768px) */
        <section
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            backgroundColor: "var(--color-bg)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              position: "relative",
              width: "1440px",
              height: "1080px",
              transformOrigin: "top center",
              transform: "scale(min(calc(100vw / 1440), calc(100vh / 1080)))",
              marginBottom: "calc((min(calc(100vw / 1440), calc(100vh / 1080)) - 1) * 1080px)"
            }}
          >
            {/* Top Bar */}
            <header style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100px", zIndex: 30, display: "flex", alignItems: "center" }}>
              <div
                onClick={() => onNavigate("#/")}
                style={{ position: "absolute", left: "37px", top: "36px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM4 12C4 7.58 7.58 4 12 4C14.07 4 15.94 4.79 17.36 6.07L6.07 17.36C4.79 15.94 4 14.07 4 12ZM12 20C9.93 20 8.06 19.21 6.64 17.93L17.93 6.64C19.21 8.06 20 9.93 20 12C20 16.42 16.42 20 12 20Z" fill="var(--color-forest)"/>
                </svg>
                <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-ink)", letterSpacing: "-0.03em" }}>{PROJECT_NAME}</span>
              </div>

              <nav style={{ position: "absolute", left: "505px", top: "40px", display: "flex", gap: "31px", fontSize: "16.4px", color: "var(--color-ink)", fontWeight: 500 }}>
                <a href="#how-it-works">How it works</a>
                <a href="#plans">Plans</a>
                <a href="#themes">Themes</a>
                <a href="#ai-assistant">AI assistant</a>
                <a href="#faq">FAQ</a>
              </nav>

              <button
                onClick={() => onNavigate("#/login")}
                style={{ position: "absolute", left: "1211px", top: "29px", width: "92px", height: "40px", borderRadius: "9999px", backgroundColor: "#FFFFFF", color: "var(--color-forest)", fontWeight: 600, border: "1px solid #DCE3D6" }}
              >
                Log in
              </button>
              <button
                onClick={() => onNavigate("#/signup")}
                style={{ position: "absolute", left: "1304px", top: "29px", width: "97px", height: "40px", borderRadius: "9999px", backgroundColor: "var(--color-forest)", color: "#FFFFFF", fontWeight: 600 }}
              >
                Sign up
              </button>
            </header>

            {/* Mint Badge at (555, 115) */}
            <div
              style={{
                position: "absolute",
                left: "555px",
                top: "115px",
                width: "330px",
                height: "37px",
                backgroundColor: "var(--color-mint)",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16.6px",
                fontWeight: 500,
                color: "var(--color-forest)"
              }}
            >
              Built for small shops and franchises
            </div>

            {/* Centred Headline top 176 */}
            <div style={{ position: "absolute", top: "176px", left: 0, width: "100%", textAlign: "center", pointerEvents: "none", zIndex: 10 }}>
              <h1
                style={{
                  fontFamily: "var(--font-headline)",
                  fontSize: "88px",
                  lineHeight: "92px",
                  letterSpacing: "-0.035em",
                  color: "var(--color-ink)",
                  margin: 0
                }}
              >
                Turn Your Shelf<br />
                <span style={{ letterSpacing: "-0.022em" }}>into a Shareable Store</span>
              </h1>
            </div>

            {/* Subline centred top 394 */}
            <div style={{ position: "absolute", top: "394px", left: 0, width: "100%", textAlign: "center", zIndex: 10, pointerEvents: "none" }}>
              <p style={{ fontSize: "20.8px", lineHeight: "32px", color: "var(--color-muted)", margin: 0 }}>
                Add your products, pick a theme and share one QR code. Take<br />
                orders from walk-in customers today, then grow into a team<br />
                and an online app when you are ready.
              </p>
            </div>

            {/* Hand-drawn notes */}
            <div style={{ position: "absolute", left: "263px", top: "377px", fontFamily: "var(--font-hand)", color: "var(--color-forest)", fontSize: "36px", zIndex: 20 }}>
              //
            </div>

            <div style={{ position: "absolute", left: "1212px", top: "310px", transform: "rotate(16deg)", fontFamily: "var(--font-hand)", color: "var(--color-forest)", fontSize: "28px", zIndex: 20 }}>
              Scan to<br />order
              <svg width="80" height="120" style={{ display: "block", marginTop: "4px" }}>
                <path d="M 20,10 Q 50,60 10,100" stroke="var(--color-forest)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 5,90 L 10,100 L 20,95" stroke="var(--color-forest)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* CURVED VIDEO CAROUSEL */}
            <CurvedVideoCarousel scaleUnit={1} />

            {/* CTA Buttons */}
            <div style={{ position: "absolute", top: "895px", left: "50%", transform: "translateX(-50%)", zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ height: "74px", borderRadius: "9999px", border: "2px dashed var(--color-forest)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
                  <button
                    onClick={() => onNavigate("#/signup")}
                    style={{
                      padding: "0 28px",
                      height: "58px",
                      borderRadius: "9999px",
                      backgroundColor: "var(--color-forest)",
                      color: "#FFFFFF",
                      fontSize: "17px",
                      fontWeight: 600,
                      boxShadow: "0 6px 16px rgba(8, 72, 45, 0.25)",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Create my catalogue
                  </button>
                </div>

                <div style={{ height: "74px", borderRadius: "9999px", border: "2px solid #DAE7C7", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
                  <button
                    onClick={() => onNavigate("#/franchise-signup")}
                    style={{
                      padding: "0 28px",
                      height: "58px",
                      borderRadius: "9999px",
                      backgroundColor: "#FFFFFF",
                      color: "var(--color-forest)",
                      border: "2px solid var(--color-forest)",
                      fontSize: "17px",
                      fontWeight: 700,
                      boxShadow: "0 6px 16px rgba(8, 72, 45, 0.12)",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span>🏢</span> Start my franchise ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTIONS 2 TO 9 (Fluid Responsive Container) */}
      <div style={{ maxWidth: "1200px", margin: isMobile ? "32px auto" : "64px auto", padding: isMobile ? "0 16px" : "0 24px" }}>
        {/* Section 2: 3 Steps */}
        <section id="how-it-works" style={{ margin: isMobile ? "48px 0" : "96px 0", textAlign: "center" }}>
          <span style={{ color: "var(--color-forest)", fontWeight: 700, textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.1em" }}>Simple Workflow</span>
          <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "32px" : "44px", margin: "8px 0 40px", color: "var(--color-ink)" }}>From shelf to QR in 3 steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px" }}>
            <div style={{ background: "#FFFFFF", padding: isMobile ? "24px 20px" : "36px 28px", borderRadius: "24px", border: "1px solid #E5EADF", textAlign: "left" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-mint)", color: "var(--color-forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>1</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 10px" }}>Add your products</h3>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "22px", margin: 0 }}>Input item names, prices, and snap quick photos from your mobile phone or tablet.</p>
            </div>
            <div style={{ background: "#FFFFFF", padding: isMobile ? "24px 20px" : "36px 28px", borderRadius: "24px", border: "1px solid #E5EADF", textAlign: "left" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-mint)", color: "var(--color-forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>2</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 10px" }}>Pick a theme</h3>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "22px", margin: 0 }}>Choose between Classic, Minimalist, or Bold layouts and apply your distinctive shop brand colour.</p>
            </div>
            <div style={{ background: "#FFFFFF", padding: isMobile ? "24px 20px" : "36px 28px", borderRadius: "24px", border: "1px solid #E5EADF", textAlign: "left" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--color-mint)", color: "var(--color-forest)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>3</div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 10px" }}>Share your QR</h3>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "22px", margin: 0 }}>Print your counter QR display stand or share your storefront link directly across messaging apps.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Features Grid */}
        <section style={{ margin: isMobile ? "48px 0" : "96px 0" }}>
          <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "30px" : "40px", textAlign: "center", marginBottom: "36px" }}>Everything you need to sell seamlessly</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {[
              { title: "Premade Themes", desc: "Instantly switchable design layouts crafted specifically for small businesses." },
              { title: "Manual Product & Price Updates", desc: "No complex spreadsheets. Update availability and pricing in seconds." },
              { title: "QR + Direct UPI Ordering", desc: "Customers pay your UPI ID directly. Zero intermediary gateway commission." },
              { title: "Franchise Team Logins", desc: "Give staff personal QR codes and track sales attributed to each seller." },
              { title: "Online Ordering App", desc: "Offer delivery, pickup, stock safeguards, and downloadable PWA installation assets." },
              { title: "AI Assistant", desc: "Ask questions, review summaries, and prepare catalog updates safely with human confirmation." }
            ].map((f, i) => (
              <div key={i} style={{ background: "#FFFFFF", padding: "24px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
                <h4 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px", color: "var(--color-forest)" }}>{f.title}</h4>
                <p style={{ fontSize: "14px", color: "var(--color-muted)", margin: 0, lineHeight: "22px" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Plans */}
        <section id="plans" style={{ margin: isMobile ? "48px 0" : "96px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <span style={{ color: "var(--color-forest)", fontWeight: 700, textTransform: "uppercase", fontSize: "13px" }}>Transparent Growth</span>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "30px" : "42px", margin: "8px 0" }}>Choose the plan that fits your shop</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
            {(["offline", "franchise", "online"] as const).map(key => {
              const p = PLANS[key];
              const isPopular = key === "franchise";
              return (
                <div key={key} style={{ background: "#FFFFFF", padding: isMobile ? "28px 24px" : "36px 32px", borderRadius: "24px", border: isPopular ? "2px solid var(--color-forest)" : "1px solid #E5EADF", position: "relative", display: "flex", flexDirection: "column" }}>
                  {isPopular && (
                    <div style={{ position: "absolute", top: "-14px", right: "20px", background: "var(--color-forest)", color: "#FFFFFF", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700 }}>
                      Most popular
                    </div>
                  )}
                  <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>{p.name}</h3>
                  <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: "0 0 16px" }}>{p.tagline}</p>
                  <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--color-forest)", marginBottom: "20px" }}>
                    {PLAN_PRICES[key] !== null ? `₹${PLAN_PRICES[key]}` : "Pricing on request"}
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {p.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: "13px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>✓</span> <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onNavigate("#/signup")}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "9999px",
                      backgroundColor: isPopular ? "var(--color-forest)" : "var(--color-mint)",
                      color: isPopular ? "#FFFFFF" : "var(--color-forest)",
                      fontWeight: 700,
                      fontSize: "14px"
                    }}
                  >
                    Get started, upgrade anytime
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 5: Themes Gallery Preview */}
        <section id="themes" style={{ margin: isMobile ? "48px 0" : "96px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "28px" : "36px", margin: 0 }}>Explore Storefront Themes</h2>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>Distinct visual directions built to showcase your inventory at its best.</p>
            </div>
            <button onClick={() => onNavigate("#/themes")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 700, fontSize: "14px" }}>
              See all themes →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {Object.values(THEME_REGISTRY).map(t => (
              <div key={t.key} style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", padding: "20px" }}>
                <h4 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 6px" }}>{t.name}</h4>
                <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: "0 0 16px" }}>{t.description}</p>
                <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
                  {t.palette.map((c, i) => (
                    <div key={i} style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: c, border: "1px solid rgba(0,0,0,0.1)" }} />
                  ))}
                </div>
                <button
                  onClick={() => onNavigate(`#/themes/${t.key}`)}
                  style={{ width: "100%", padding: "10px", borderRadius: "9999px", background: "var(--color-bg)", color: "var(--color-forest)", fontWeight: 600, fontSize: "13px" }}
                >
                  Preview {t.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: AI Assistant Showcase */}
        <section id="ai-assistant" style={{ margin: isMobile ? "48px 0" : "96px 0", background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: isMobile ? "28px 16px" : "48px 40px" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", textAlign: "center" }}>
            <span style={{ background: "var(--color-mint)", color: "var(--color-forest)", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700 }}>Example</span>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "26px" : "36px", margin: "14px 0 8px" }}>Safe, Confirmed AI Assistance</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "24px" }}>
              The assistant never changes anything until you confirm.
            </p>
            <div style={{ background: "var(--color-bg)", borderRadius: "18px", padding: "18px", textAlign: "left", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ alignSelf: "flex-end", background: "var(--color-forest)", color: "#FFFFFF", padding: "10px 14px", borderRadius: "16px 16px 2px 16px", fontSize: "13px" }}>
                Can you increase the sourdough bread price to ₹300?
              </div>
              <div style={{ alignSelf: "flex-start", background: "#FFFFFF", border: "1px solid #E5EADF", padding: "14px", borderRadius: "16px 16px 16px 2px", width: "100%", maxWidth: "420px" }}>
                <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 500 }}>I have prepared a pending proposal for you:</p>
                <div style={{ background: "#F5F8EF", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "10px" }}>
                  <b>Action:</b> Update price of "Classic Country Sourdough" from ₹280 to ₹300.
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ flex: 1, padding: "8px", background: "var(--color-forest)", color: "#fff", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 }}>Confirm</button>
                  <button style={{ flex: 1, padding: "8px", background: "#E5EADF", color: "var(--color-ink)", borderRadius: "9999px", fontSize: "12px", fontWeight: 600 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: For Franchises Table */}
        <section style={{ margin: isMobile ? "48px 0" : "96px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "26px" : "36px", margin: 0 }}>Built for Floor Teams & Franchises</h2>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>Attribution tracking for every sales member.</p>
            </div>
            <span style={{ fontSize: "11px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "3px 8px", borderRadius: "9999px", fontWeight: 700 }}>Sample data</span>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)" }}>
                  <th style={{ padding: "14px 16px" }}>Staff Member</th>
                  <th style={{ padding: "14px 16px" }}>Orders</th>
                  <th style={{ padding: "14px 16px" }}>Units Sold</th>
                  <th style={{ padding: "14px 16px" }}>Collected Revenue</th>
                  <th style={{ padding: "14px 16px" }}>Pending Payment</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #F0F4EC" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Ananya (Floor Lead)</td>
                  <td style={{ padding: "14px 16px" }}>24</td>
                  <td style={{ padding: "14px 16px" }}>48</td>
                  <td style={{ padding: "14px 16px", color: "var(--color-forest)", fontWeight: 700 }}>₹14,200</td>
                  <td style={{ padding: "14px 16px", color: "var(--color-muted)" }}>₹1,600</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #F0F4EC" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>Direct / Counter Stand</td>
                  <td style={{ padding: "14px 16px" }}>41</td>
                  <td style={{ padding: "14px 16px" }}>79</td>
                  <td style={{ padding: "14px 16px", color: "var(--color-forest)", fontWeight: 700 }}>₹26,800</td>
                  <td style={{ padding: "14px 16px", color: "var(--color-muted)" }}>₹2,400</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 8: FAQ Accordion */}
        <section id="faq" style={{ margin: isMobile ? "48px 0" : "96px 0", maxWidth: "800px", marginInline: "auto" }}>
          <h2 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "28px" : "36px", textAlign: "center", marginBottom: "32px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5EADF", overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{ width: "100%", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", textAlign: "left" }}
                >
                  <span>{faq.q}</span>
                  <span>{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div style={{ padding: "0 20px 16px", color: "var(--color-muted)", fontSize: "13px", lineHeight: "22px" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 9: Final Call to Action & Footer */}
        <footer style={{ marginTop: isMobile ? "64px" : "120px", paddingTop: "48px", borderTop: "1px solid #E5EADF", textAlign: "center" }}>
          <h3 style={{ fontFamily: "var(--font-headline)", fontSize: isMobile ? "26px" : "32px", margin: "0 0 12px" }}>Ready to share your catalogue?</h3>
          <p style={{ color: "var(--color-muted)", fontSize: "15px", marginBottom: "24px" }}>Get your catalogue and payment QR live in under 5 minutes.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => onNavigate("#/signup")}
              style={{ padding: "14px 32px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontSize: "15px", fontWeight: 700 }}
            >
              Create my catalogue
            </button>
            <button
              onClick={() => onNavigate("#/franchise-signup")}
              style={{ padding: "13px 28px", borderRadius: "9999px", background: "#FFFFFF", border: "2px solid var(--color-forest)", color: "var(--color-forest)", fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span>🏢</span> Start my franchise ➔
            </button>
          </div>
          
          <div style={{ marginTop: "48px", padding: "20px 0", borderTop: "1px solid #E5EADF", display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--color-muted)" }}>
            <div>Prototype: data is stored in this browser only.</div>
            <div style={{ display: "flex", gap: "16px" }}>
              <button onClick={() => onNavigate("#/admin")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600 }}>Platform admin (demo)</button>
              <button onClick={() => onNavigate("#/diagnostics")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600 }}>Self-tests (Diagnostics)</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
