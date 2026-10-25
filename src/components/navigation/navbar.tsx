import Link from "next/link";
import { Zap } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export default async function Navbar() {
  // Server-side check: check if user is logged in
  const user = await currentUser();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-neutral-950/70 border-b border-neutral-800/60">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
        <div className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white">
          <Zap className="w-5 h-5 fill-white" />
        </div>
        <span>Fuzzie</span>
      </Link>

      {/* Navigation Links */}
      <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-400 font-medium">
        <Link href="#features" className="hover:text-white transition">
          Features
        </Link>
        <Link href="#pricing" className="hover:text-white transition">
          Pricing
        </Link>
        <Link href="#documentation" className="hover:text-white transition">
          Documentation
        </Link>
        <Link href="#enterprise" className="hover:text-white transition">
          Enterprise
        </Link>
      </nav>

      {/* Right Side Auth CTAs */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 transition"
            >
              Dashboard
            </Link>
            <UserButton />
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-neutral-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white text-black hover:bg-neutral-200 transition"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
