import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Agents",
  description: "Pipeline multi-agente para geração automatizada de criativos de marketing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  );
}
