import avatarLogo from "@/assets/avatar-logo.svg";

const PaymentRightPanel = () => {
  return (
    <div className="h-full min-h-[520px] rounded-2xl bg-muted flex flex-col items-center justify-center text-center p-10">
      <img src={avatarLogo} alt="Avatar centrum zdrowia" className="h-24 w-auto mb-10" />
      <p className="text-2xl font-semibold text-foreground mb-4">Przyszłość diagnostyki</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        Wszystko jest możliwe, ale decyzja należy do Ciebie
      </p>
    </div>
  );
};

export default PaymentRightPanel;

