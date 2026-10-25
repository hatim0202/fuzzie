import Link from "next/link";
import Navbar from "@/components/navigation/navbar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 p-6 pt-24">
      <Navbar />
      {/* Header Tag */}
      <div className="text-center space-y-4 max-w-2xl">
        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-full">
          Workflow Automation Platform
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          Automate Work <br />
          <span className="text-neutral-400">Without Writing Code</span>
        </h1>

        <p className="text-neutral-400 text-lg">
          Connect your favorite tools like Discord, Slack, Notion, and Google Drive in a visual drag-and-drop canvas.
        </p>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 transition"
          >
            Get Started
          </Link>
          <button className="px-6 py-3 rounded-lg bg-neutral-900 text-neutral-300 font-semibold border border-neutral-800 hover:bg-neutral-800 transition">
            Documentation
          </button>
        </div>

        {/* Highlight Subtitle */}
        <p className="text-xs text-neutral-500 pt-2">
          Free 100 credits on signup • No credit card required
        </p>
      </div>
    </main>
  );
}
