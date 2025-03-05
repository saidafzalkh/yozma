import { Inter } from "next/font/google";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen flex justify-center px-4">
          <div className="w-full max-w-3xl p-6 mt-10 prose lg:prose-lg">
            {children}
            <footer>
              <small>
                &copy; {new Date().getFullYear()} Yozma | MIT License
              </small>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
