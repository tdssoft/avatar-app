import { ReactNode } from "react";
import avatarLogo from "@/assets/avatar-logo.svg";

interface SplitLayoutProps {
  children: ReactNode;
  right?: ReactNode;
}

const DefaultRight = () => (
  <div className="h-full min-h-[520px] rounded-2xl bg-muted flex flex-col items-center justify-center text-center p-10">
    <img src={avatarLogo} alt="Avatar centrum zdrowia" className="h-24 w-auto mb-10" />
    <p className="text-3xl font-semibold text-foreground leading-snug">
      Wszystko jest możliwe ale
      <br />
      decyzja należy do Ciebie
    </p>
  </div>
);

const SplitLayout = ({ children, right }: SplitLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-10">
      <div className="w-full max-w-6xl bg-card border border-border rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr]">
          <div className="p-8 md:p-10">{children}</div>
          <div className="hidden lg:block p-8 md:p-10">{right ?? <DefaultRight />}</div>
        </div>
      </div>
    </div>
  );
};

export default SplitLayout;

