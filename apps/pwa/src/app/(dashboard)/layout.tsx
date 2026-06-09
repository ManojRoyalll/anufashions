import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[256px_1fr]">
      <AppSidebar />
      <main className="space-y-4 p-4 md:p-6">
        <AppHeader />
        {children}
      </main>
    </div>
  );
}
