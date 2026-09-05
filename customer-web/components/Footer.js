import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white/50 mt-auto">
      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        <div className="flex gap-5 text-xs">
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-white">Refund & Cancellation</Link>
        </div>
      </div>
    </footer>
  );
}
