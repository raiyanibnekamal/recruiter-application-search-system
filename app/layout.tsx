import "./globals.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

// Dynamic so we can read the per-request `x-nonce` set by middleware
// and forward it into a `<meta>` tag for any client code that wants
// to inject its own inline script (none today, but the hook is here).
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "Applications Search",
    template: "%s · Applications Search",
  },
  description: "Recruiter search for job applications.",
  applicationName: "Applications Search",
  authors: [{ name: "Recruiter Search" }],
  robots: {
    index: false, // gated behind auth — don't index login pages
    follow: false,
  },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: "Applications Search",
    title: "Applications Search",
    description: "Recruiter search for job applications.",
  },
  twitter: {
    card: "summary",
    title: "Applications Search",
    description: "Recruiter search for job applications.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b0d12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware sets x-nonce on every request. We expose it to
  // the client via a meta tag so any future client-side script can
  // request a matching nonce. Today's code does not inject inline
  // scripts; this is purely a forward-compatible hook.
  const nonce = headers().get("x-nonce") ?? "";

  return (
    <html lang="en">
      <head>
        {nonce ? <meta name="csp-nonce" content={nonce} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
