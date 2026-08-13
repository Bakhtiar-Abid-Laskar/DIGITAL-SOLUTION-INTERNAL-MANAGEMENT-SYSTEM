import AdminLayout from "@/components/layout/AdminLayout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
