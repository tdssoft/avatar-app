import { ReactNode } from "react";
import avatarLogo from "@/assets/avatar-logo.svg";

interface InterviewSplitLayoutProps {
  children: ReactNode;
}

const InterviewSplitLayout = ({ children }: InterviewSplitLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#17181f] p-3 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <div className="rounded-2xl bg-[#ececec] border border-[#d8d8d8] p-4 md:p-6 lg:p-8 min-h-[80vh]">
            {children}
          </div>

          <div className="rounded-2xl bg-[#ececec] border border-[#d8d8d8] p-8 hidden lg:flex flex-col items-center justify-center text-center">
            <img src={avatarLogo} alt="Avatar" className="h-20 w-auto mb-14" />
            <p className="text-4xl font-semibold text-[#222] leading-tight">
              Wszystko jest możliwe ale decyzja
              <br />
              należy do Ciebie
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSplitLayout;
