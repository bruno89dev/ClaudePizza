import { AppShell } from "@/components/layout/AppShell";
import { OrderToast } from "@/components/admin/OrderToast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <OrderToast />
    </AppShell>
  );
}
