import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatientMessages } from "@/hooks/usePatientMessages";

const Messages = () => {
  const { messages, isLoading, markAllRead } = usePatientMessages();

  // Mark all as read when page is opened
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Wiadomości</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tutaj znajdziesz wiadomości i odpowiedzi od swojego dietetyka.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading && (
              <p className="text-muted-foreground text-sm py-4">Ładowanie...</p>
            )}

            {!isLoading && messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Brak wiadomości</p>
                <p className="text-sm mt-1 opacity-70">
                  Wiadomości od dietetyka pojawią się tutaj.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isAdmin = msg.message_type !== "question";
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border ${
                    isAdmin
                      ? "bg-blue-50 border-blue-200"
                      : "bg-muted border-border"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-foreground">
                      {isAdmin ? "👨‍⚕️ Dietetyk AVATAR" : "🙋 Ty"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msg.sent_at
                        ? new Date(msg.sent_at).toLocaleString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {msg.message_text}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
