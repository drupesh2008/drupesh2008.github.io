import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D Rupesh Kumar - Portfolio",
  description: "Personal portfolio website showcasing projects and skills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
