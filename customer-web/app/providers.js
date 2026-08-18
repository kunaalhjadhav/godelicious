"use client";

import { AuthProvider } from "@/lib/useAuth";
import { CartProvider } from "@/lib/useCart";
import ChatWidget from "@/components/ChatWidget";
import Onboarding from "@/components/Onboarding";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <ChatWidget />
        <Onboarding />
      </CartProvider>
    </AuthProvider>
  );
}
