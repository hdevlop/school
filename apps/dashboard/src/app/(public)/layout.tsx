import '@/features/Landing/landing.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="landing h-svh overflow-y-auto scroll-smooth motion-reduce:scroll-auto">{children}</div>;
}
