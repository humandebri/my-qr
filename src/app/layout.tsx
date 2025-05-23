import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./client-providers";

const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wallet App",
  description: "Welcome to my app!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetBrainsMono.className} bg-white`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
