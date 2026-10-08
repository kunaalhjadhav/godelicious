import "./globals.css";
import Providers from "./providers";
import { APP_NAME } from "@/lib/brand";

export const metadata = {
  title: `${APP_NAME} Admin`,
  description: `Operations dashboard for ${APP_NAME}`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
