"use client";

import { AuthProvider } from "@/lib/useAuth";
import { CartProvider } from "@/lib/useCart";
import ChatWidget from "@/components/ChatWidget";
import Onboarding from "@/components/Onboarding";
import Footer from "@/components/Footer";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <Footer />
        <ChatWidget />
        <Onboarding />
      </CartProvider>
    </AuthProvider>
  );
}
