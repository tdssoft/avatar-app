import { createContext, useContext, ReactNode } from "react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

type AdminNotificationsContextValue = ReturnType<typeof useAdminNotifications>;

const AdminNotificationsContext = createContext<AdminNotificationsContextValue | null>(null);

export const AdminNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const value = useAdminNotifications();
  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
};

export const useAdminNotificationsContext = (): AdminNotificationsContextValue => {
  const ctx = useContext(AdminNotificationsContext);
  if (!ctx) throw new Error("useAdminNotificationsContext must be used inside AdminNotificationsProvider");
  return ctx;
};
