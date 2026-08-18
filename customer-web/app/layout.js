import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: `Order catering online or enquire about your venue with ${APP_NAME}.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} ${mono.variable} font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
