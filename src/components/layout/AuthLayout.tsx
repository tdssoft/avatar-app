import { ReactNode } from "react";
import SplitLayout from "@/components/layout/SplitLayout";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <SplitLayout>{children}</SplitLayout>
  );
};

export default AuthLayout;
