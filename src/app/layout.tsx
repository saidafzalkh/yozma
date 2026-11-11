import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SITE } from "@/lib/site";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.title}` },
  description: SITE.description,
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={inter.className}>
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen flex justify-center px-4">
          <div className="w-full max-w-3xl p-6 mt-10 prose lg:prose-lg prose-code:before:content-none prose-code:after:content-none">
            {children}
            <footer>
              <small>
                &copy; {new Date().getFullYear()} Yozma | MIT litsenziyasi
              </small>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
