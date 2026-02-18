import { ReactNode } from "react";
import avatarLogo from "@/assets/avatar-logo.svg";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-card rounded-xl p-8 shadow-lg">
          {children}
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex flex-1 bg-secondary items-center justify-center p-12">
        <div className="text-center">
          <img
            src={avatarLogo}
            alt="Avatar centrum zdrowia"
            className="h-24 w-auto mx-auto mb-8"
          />
          <p className="text-foreground/80 text-base leading-relaxed">
            Wszystko jest możliwe,
            <br />
            ale decyzja należy do Ciebie
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
