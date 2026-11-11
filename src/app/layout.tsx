import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Yozma", template: "%s · Yozma" },
  description:
    "Yozma — şaxsiy veb-blog: fikrlar, ğoyalar va kaşfiyotlar haqida yozmalar.",
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
          <div className="w-full max-w-3xl p-6 mt-10 prose lg:prose-lg">
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
