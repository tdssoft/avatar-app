import { ReactNode } from "react";
import avatarLogo from "@/assets/avatar-logo.svg";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
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
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Przyszłość diagnostyki
          </h2>
          <p className="text-foreground/80 text-base leading-relaxed">
            Zadbaj o swojego AVATARA
            <br />
            Zadbaj o swoje ciało
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
