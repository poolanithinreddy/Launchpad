import type { Metadata } from "next";

import "@/app/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Launchpad",
  description: "Deploy anything. Instantly."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
