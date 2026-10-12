import { landingFont } from '@/features/Landing/config/landingFont';
import '@/features/Landing/landing.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`landing ${landingFont.variable} h-svh overflow-y-auto scroll-smooth motion-reduce:scroll-auto`}>{children}</div>;
}
