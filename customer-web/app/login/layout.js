import Link from "next/link";

// Green-gradient sign-in shell. This wraps the existing login page WITHOUT
// editing it (the page's OTP logic stays untouched); the look is applied by
// the .auth-skin rules in app/globals.css.
export const metadata = { title: "Sign in — Godelicious" };

export default function LoginLayout({ children }) {
  return (
    <div className="auth-skin">
      <Link href="/" className="auth-close" aria-label="Close">✕</Link>
      {children}
      <p className="auth-terms">
        By proceeding, you agree to our{" "}
        <Link href="/terms">T&amp;Cs</Link> and <Link href="/privacy">Privacy Policy</Link>
      </p>
    </div>
  );
}
