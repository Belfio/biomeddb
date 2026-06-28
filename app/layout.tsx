import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist_Mono } from "next/font/google";
import { Container } from "@/components/ui/Container";
import "./globals.css";

// Geist Mono stays available as the DATA face (modality codes, scores, licenses,
// counts). The body face is the Apple system stack, wired in globals.css.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "biomeddb",
  description:
    "Search engine and community catalog for biomedical datasets. Find datasets by what they measure and the conditions they're linked to.",
};

export const viewport: Viewport = {
  themeColor: "#fbfbfd",
};

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-surface/70 backdrop-blur-xl backdrop-saturate-150">
      <Container className="flex h-14 items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-[-0.02em] text-text"
        >
          biomeddb
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/contribute"
            className="font-medium text-text transition-colors hover:text-accent"
          >
            Contribute
          </Link>
          <Link
            href="/sign-in"
            className="text-secondary transition-colors hover:text-text"
          >
            Sign in
          </Link>
        </nav>
      </Container>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-bg text-text antialiased">
        <Nav />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
