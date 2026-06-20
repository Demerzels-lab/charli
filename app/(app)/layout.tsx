import { AppNav } from '@/components/AppNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <AppNav />
      {children}
    </div>
  );
}
