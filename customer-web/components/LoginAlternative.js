"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api2 } from "@/lib/api2";
import { firebaseReady } from "@/lib/firebaseAuth";

// "Other ways to sign in" under the sign-in forms. Each method appears only when it is set up.
export default function LoginAlternative() {
  const pathname = usePathname() || "";
  const [wa, setWa] = useState(false);
  const [fb, setFb] = useState(false);

  useEffect(() => {
    api2.waStatus().then((d) => setWa(Boolean(d.enabled))).catch(() => {});
    if (firebaseReady()) api2.firebaseStatus().then((d) => setFb(Boolean(d.enabled))).catch(() => {});
  }, []);

  const options = [
    { href: "/login", label: "SMS code", on: true },
    { href: "/login/whatsapp", label: "WhatsApp code", on: wa },
    { href: "/login/phone", label: "Phone code (Firebase)", on: fb },
    { href: "/login/email", label: fb ? "Email or Google" : "Email", on: true },
  ].filter((o) => o.on && o.href !== pathname);

  return (
    <p className="auth-alt">
      <span className="auth-alt-label">Other ways to sign in</span>
      {options.map((o) => <Link key={o.href} href={o.href}>{o.label}</Link>)}
    </p>
  );
}
