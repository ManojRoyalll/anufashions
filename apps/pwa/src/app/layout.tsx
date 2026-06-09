import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "Anu Fashions PWA",
  description: "Sarees and ladies wear retail management",
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
