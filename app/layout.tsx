import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grupo de São Paulo Simulator",
  description:
    "Simulador de brincadeira do grupo de Flesh and Blood de São Paulo: discuta com o Ricardo ou com o Pedro. Você entra no papel do outro e tenta vencer o argumento.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
