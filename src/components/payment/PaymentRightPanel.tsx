import avatarLogo from "@/assets/avatar-logo.svg";

const PaymentRightPanel = () => {
  return (
    <div className="h-full min-h-[520px] rounded-2xl bg-muted flex flex-col items-center justify-center text-center p-10">
      <img src={avatarLogo} alt="Avatar centrum zdrowia" className="h-24 w-auto mb-10" />
      <p className="text-2xl font-bold text-foreground mb-2">Zadbaj o swojego AVATARA</p>
      <p className="text-base text-muted-foreground max-w-sm">
        Zadbaj o swoje ciało.
      </p>
    </div>
  );
};

export default PaymentRightPanel;
