import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background w-full">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto scrollbar-hide">
        <div className="container mx-auto px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
