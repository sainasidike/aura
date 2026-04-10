import BottomNav from "@/components/ui/BottomNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex flex-1 flex-col">{children}</main>
      <BottomNav />
    </>
  );
}
