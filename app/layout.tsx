import "./globals.css";
import type { Metadata, Viewport } from "next";

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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
