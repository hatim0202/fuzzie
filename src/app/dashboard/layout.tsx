import Sidebar from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-neutral-900/40">
        {children}
      </main>
    </div>
  );
}
