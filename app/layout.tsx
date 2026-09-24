import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications Search",
  description: "Recruiter search for job applications",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
