"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useSyncExternalStore } from "react";
import { getBookingFlowServerSnapshot, getBookingFlowSnapshot, subscribeBookingFlow } from "@/lib/booking-flow-client";

const fallbackGlobalContent = {
  siteName: "Scot Travels",
  supportPhone: "+44 (0) 203 322 7723",
  supportEmail: "support@scottravels.co.uk",
  serviceTagline: "AIRPORT TRANSFERS TAXI SERVICE",
  navLinks: [
    { label: "HOME", href: "/" },
    { label: "FAQ'S", href: "/faq" },
    { label: "T&C'S", href: "/terms" },
    { label: "AIRPORT TRANSFERS", href: "/airport-transfers" },
    { label: "CHAUFFEURS", href: "/chauffeurs" },
    { label: "CRUISE AND FERRY PORTS", href: "/cruise-ferry" },
    { label: "CONTACT US", href: "/contact" },
  ],
  navLabels: {
    quote: "Book Now",
    dashboard: "Dashboard",
    admin: "Admin",
    login: "LOGIN",
    signup: "Sign Up",
    logout: "Sign Out",
  },
};

export function SiteNav({ globalContent }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const bookingFlow = useSyncExternalStore(
    subscribeBookingFlow,
    getBookingFlowSnapshot,
    getBookingFlowServerSnapshot,
  );

  if (pathname.startsWith("/admin") || pathname.startsWith("/quote/success/print")) {
    return null;
  }

  const basketCount = bookingFlow?.route?.pickup && bookingFlow?.route?.dropoff ? 1 : 0;

  const ui = {
    ...fallbackGlobalContent,
    ...(globalContent || {}),
    navLinks:
      Array.isArray(globalContent?.navLinks) && globalContent.navLinks.length > 0
        ? globalContent.navLinks
        : fallbackGlobalContent.navLinks,
    navLabels: {
      ...fallbackGlobalContent.navLabels,
      ...(globalContent?.navLabels || {}),
    },
  };

  return (
    <>
      <style>{`
        .nav-global {
          // position: fixed;
          inset-x: 0;
          // top: 0;
          // z-index: 50;
          width: 100%;
          background: linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.75) 100%);
          backdrop-filter: blur(4px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .nav-global-inner {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0.75rem 2rem;
        }
        .nav-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-logo-circle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        .nav-logo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .nav-info {
          text-align: right;
          color: white;
          line-height: 1.5;
        }
        .nav-info-phone {
          font-size: 0.9rem;
          font-weight: 400;
        }
        .nav-info-phone span {
          color: #22d3ee;
          font-weight: 600;
        }
        .nav-info-tagline {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .nav-info-auth {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .nav-info-auth a,
        .nav-info-auth button {
          color: white;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
        }
        .nav-info-auth .basket-count {
          color: #22d3ee;
          font-weight: 700;
        }
        .nav-info-auth .divider { opacity: 0.5; }
        .nav-bottom {
          border-top: 1px solid rgba(255,255,255,0.15);
          margin-top: 0.5rem;
          padding: 0.5rem 0 0.25rem;
        }
        .nav-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.25rem 1.5rem;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .nav-links a {
          color: rgba(255,255,255,0.9);
          text-decoration: none;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .nav-links a:hover { color: #22d3ee; }
       
      `}</style>

      <header className="nav-global">
        <div className="nav-global-inner">
          <div className="nav-top">
            <Link href="/" className="nav-logo-circle">
              <img src="/images/logo.png" alt="Scot Travels" className="nav-logo-image" />
            </Link>

            <div className="nav-info">
              <div className="nav-info-phone">
                Call us <span>{ui.supportPhone || fallbackGlobalContent.supportPhone}</span>
              </div>
              <div className="nav-info-tagline">
                {ui.serviceTagline || fallbackGlobalContent.serviceTagline}
              </div>
              <div className="nav-info-auth">
                {session?.user ? (
                  <>
                    <span>{session.user.email?.split("@")[0]}</span>
                    <span className="divider">|</span>
                    <button onClick={() => signOut({ callbackUrl: "/" })}>
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <Link href="/login">LOGIN</Link>
                )}
                <span className="divider">|</span>
                <Link href="/basket">
                  MY BASKET&nbsp;<span className="basket-count">({basketCount})</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="nav-bottom">
            <nav>
              <ul className="nav-links">
                {ui.navLinks.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
                {session?.user?.role === "admin" && (
                  <li>
                    <Link href="/admin">ADMIN</Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
