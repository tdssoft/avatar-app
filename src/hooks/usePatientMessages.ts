import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PatientMessage {
  id: string;
  message_type: string;
  message_text: string;
  sent_at: string | null;
  person_profile_id: string | null;
}

const POLL_INTERVAL_MS = 30_000;

// Module-level singleton to avoid duplicate intervals on HMR
let globalInterval: ReturnType<typeof setInterval> | null = null;
let globalPatientId: string | null = null;

export function usePatientMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PatientMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // localStorage key per user
  const lastReadKey = user?.id ? `avatar:messages_last_read:${user.id}` : null;

  const computeUnread = useCallback(
    (msgs: PatientMessage[]) => {
      if (!lastReadKey) return 0;
      const lastReadAt = localStorage.getItem(lastReadKey);
      return msgs.filter(
        (m) =>
          m.message_type !== "question" &&
          m.sent_at &&
          (!lastReadAt || new Date(m.sent_at) > new Date(lastReadAt))
      ).length;
    },
    [lastReadKey]
  );

  const fetchMessages = useCallback(
    async (pid: string) => {
      const { data, error } = await supabase
        .from("patient_messages")
        .select("id, message_type, message_text, sent_at, person_profile_id")
        .eq("patient_id", pid)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("[usePatientMessages] fetch error:", error);
        return;
      }
      const msgs = (data ?? []) as PatientMessage[];
      setMessages(msgs);
      setUnreadCount(computeUnread(msgs));
    },
    [computeUnread]
  );

  // Get patient_id once on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setPatientId(data.id);
      });
  }, [user?.id]);

  // Polling + focus refresh
  useEffect(() => {
    if (!patientId) return;

    setIsLoading(true);
    fetchMessages(patientId).finally(() => setIsLoading(false));

    intervalRef.current = setInterval(() => fetchMessages(patientId), POLL_INTERVAL_MS);

    const onFocus = () => fetchMessages(patientId);
    window.addEventListener("focus", onFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [patientId, fetchMessages]);

  // Re-compute unread when lastReadKey changes (e.g. after markAllRead)
  useEffect(() => {
    setUnreadCount(computeUnread(messages));
  }, [computeUnread, messages]);

  const markAllRead = useCallback(() => {
    if (!lastReadKey) return;
    localStorage.setItem(lastReadKey, new Date().toISOString());
    setUnreadCount(0);
  }, [lastReadKey]);

  return { messages, unreadCount, isLoading, markAllRead, patientId };
}
