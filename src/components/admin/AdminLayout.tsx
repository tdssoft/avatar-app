import { ReactNode, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, CheckCheck, ClipboardList, Loader2, Mail, MessageSquare, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAdminNotifications, type AdminEventItem, type AdminEventType, type AdminFeedScope } from "@/hooks/useAdminNotifications";
import AdminSidebar from "./AdminSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const EVENT_META: Record<AdminEventType, { label: string; icon: typeof Bell }> = {
  patient_question: { label: "Pytanie pacjenta", icon: MessageSquare },
  support_ticket: { label: "Zgłoszenie Help", icon: Mail },
  interview_sent: { label: "Nowy wywiad", icon: ClipboardList },
  new_registration: { label: "Nowa rejestracja", icon: UserPlus },
};

const UnreadDot = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  return <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />;
};

interface AdminEventsPopoverProps {
  scope: AdminFeedScope;
  title: string;
  ariaLabel: string;
  unreadCount: number;
  events: AdminEventItem[];
  isLoading: boolean;
  onMarkEventRead: (eventId: string) => Promise<number>;
  onMarkVisibleRead: (eventIds: string[]) => Promise<number>;
}

const AdminEventsPopover = ({
  scope,
  title,
  ariaLabel,
  unreadCount,
  events,
  isLoading,
  onMarkEventRead,
  onMarkVisibleRead,
}: AdminEventsPopoverProps) => {
  const navigate = useNavigate();

  const unreadVisibleIds = useMemo(
    () => events.filter((event) => !event.is_read).map((event) => event.id),
    [events],
  );

  const openEvent = (event: AdminEventItem) => {
    if (!event.patient_id) return;

    if (event.event_type === "patient_question" || event.event_type === "support_ticket") {
      navigate(`/admin/patient/${event.patient_id}?tab=notes`);
      return;
    }

    if (event.event_type === "interview_sent") {
      navigate(`/admin/patient/${event.patient_id}?tab=interview`);
      return;
    }

    navigate(`/admin/patient/${event.patient_id}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label={ariaLabel}>
          {scope === "messages" ? (
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          <UnreadDot visible={unreadCount > 0} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">Nieprzeczytane: {unreadCount}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            disabled={unreadVisibleIds.length === 0}
            onClick={() => void onMarkVisibleRead(unreadVisibleIds)}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Oznacz widoczne
          </Button>
        </div>

        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ładowanie...
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Brak zdarzeń</div>
            ) : (
              events.map((event) => {
                const meta = EVENT_META[event.event_type];
                const EventIcon = meta.icon;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-md border px-3 py-2 mb-2 last:mb-0",
                      event.is_read ? "bg-background" : "bg-muted/30 border-primary/20",
                      event.patient_id ? "cursor-pointer" : "cursor-default",
                    )}
                    onClick={() => openEvent(event)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <EventIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{meta.label}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-tight mb-1">{event.title}</p>
                        {event.preview ? (
                          <p className="text-xs text-muted-foreground line-clamp-2">{event.preview}</p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {format(new Date(event.occurred_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                        </p>
                      </div>

                      {!event.is_read ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onMarkEventRead(event.id);
                          }}
                        >
                          Oznacz
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground shrink-0">Odczytane</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { session, user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const {
    allEvents,
    messageEvents,
    unreadAll,
    unreadMessages,
    isLoading: notificationsLoading,
    isUpdating,
    markEventRead,
    markEventsRead,
  } = useAdminNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!session) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [authLoading, roleLoading, session, isAdmin, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return null;
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "A";

  const fullName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : "Administrator";

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-background border-b border-border flex items-center justify-end px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:block">{fullName}</span>
            <div className="h-6 w-px bg-border mx-1" />

            <AdminEventsPopover
              scope="messages"
              title="Wiadomości od pacjentów"
              ariaLabel="Wiadomości"
              unreadCount={unreadMessages}
              events={messageEvents}
              isLoading={notificationsLoading || isUpdating}
              onMarkEventRead={markEventRead}
              onMarkVisibleRead={markEventsRead}
            />

            <AdminEventsPopover
              scope="all"
              title="Powiadomienia"
              ariaLabel="Powiadomienia"
              unreadCount={unreadAll}
              events={allEvents}
              isLoading={notificationsLoading || isUpdating}
              onMarkEventRead={markEventRead}
              onMarkVisibleRead={markEventsRead}
            />
          </div>
        </header>

        <main className="flex-1 min-h-0 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8 bg-primary">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
