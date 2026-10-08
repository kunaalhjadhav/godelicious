"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Registration is now folded into the phone+OTP login flow — a new phone
// number automatically creates an account on first verification, so there's
// no separate signup form needed anymore.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
