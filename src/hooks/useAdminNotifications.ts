import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const POLL_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Module-level singletons — survive component remounts AND Vite HMR hot-swaps.
// Without these, each HMR update creates a new setInterval without clearing the
// previous one, so N saves → N concurrent intervals all firing at the same time.
// ---------------------------------------------------------------------------
let _intervalId: ReturnType<typeof window.setInterval> | null = null;
let _focusHandler: (() => void) | null = null;
let _visibilityHandler: (() => void) | null = null;
let _lastFetchTs = 0; // timestamp of the most recent fetchAll call

function _teardownListeners() {
  if (_intervalId !== null) { window.clearInterval(_intervalId); _intervalId = null; }
  if (_focusHandler !== null) { window.removeEventListener("focus", _focusHandler); _focusHandler = null; }
  if (_visibilityHandler !== null) { document.removeEventListener("visibilitychange", _visibilityHandler); _visibilityHandler = null; }
}
const PAGE_SIZE = 50;
const MARK_SCOPE_PAGE_SIZE = 200;

export type AdminEventType =
  | "patient_question"
  | "support_ticket"
  | "interview_sent"
  | "interview_draft_updated"
  | "new_registration";

export type AdminFeedScope = "all" | "messages";

export interface AdminEventItem {
  id: string;
  event_type: AdminEventType;
  patient_id: string | null;
  person_profile_id: string | null;
  source_table: string;
  source_id: string;
  title: string;
  preview: string | null;
  occurred_at: string;
  created_at: string;
  is_read: boolean;
}

export interface PatientUnreadCounter {
  patient_id: string;
  unread_messages: number;
  unread_interviews: number;
}

interface AdminNotificationState {
  isLoading: boolean;
  isUpdating: boolean;
  allEvents: AdminEventItem[];
  messageEvents: AdminEventItem[];
  unreadAll: number;
  unreadMessages: number;
  byPatient: PatientUnreadCounter[];
}

const DEFAULT_STATE: AdminNotificationState = {
  isLoading: true,
  isUpdating: false,
  allEvents: [],
  messageEvents: [],
  unreadAll: 0,
  unreadMessages: 0,
  byPatient: [],
};

const MESSAGES_EVENT_TYPES: AdminEventType[] = ["patient_question", "support_ticket"];

const normalizeByPatient = (raw: unknown): PatientUnreadCounter[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const patientId = typeof row.patient_id === "string" ? row.patient_id : null;
      if (!patientId) return null;

      const unreadMessages = Number(row.unread_messages ?? 0);
      const unreadInterviews = Number(row.unread_interviews ?? 0);

      return {
        patient_id: patientId,
        unread_messages: Number.isNaN(unreadMessages) ? 0 : unreadMessages,
        unread_interviews: Number.isNaN(unreadInterviews) ? 0 : unreadInterviews,
      };
    })
    .filter((item): item is PatientUnreadCounter => item !== null);
};

export const useAdminNotifications = () => {
  const { session, isLoading: isAuthLoading } = useAuth();
  // Use undefined while auth is still loading so the polling effect doesn't fire
  // prematurely (which would produce a spurious round with adminUserId=null).
  // Once auth settles: either a string (logged in) or null (logged out).
  const adminUserId = isAuthLoading ? undefined : (session?.user?.id ?? null);

  const [state, setState] = useState<AdminNotificationState>(DEFAULT_STATE);

  const fetchAll = useCallback(
    async (initialLoad = false) => {
      if (!adminUserId) {
        // null = logged out; undefined = auth still loading — either way nothing to fetch
        setState({ ...DEFAULT_STATE, isLoading: false });
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: initialLoad ? true : prev.isLoading,
        isUpdating: !initialLoad,
      }));

      try {
        const [allFeedResp, countersResp] = await Promise.all([
          supabase.rpc("get_admin_event_feed", {
            p_scope: "all",
            p_limit: PAGE_SIZE,
            p_offset: 0,
          }),
          supabase.rpc("get_admin_unread_counters"),
        ]);

        if (allFeedResp.error) throw allFeedResp.error;
        if (countersResp.error) throw countersResp.error;

        const allEvents = (allFeedResp.data ?? []) as AdminEventItem[];
        const countersRow = Array.isArray(countersResp.data) ? countersResp.data[0] : null;

        setState({
          isLoading: false,
          isUpdating: false,
          allEvents,
          messageEvents: allEvents.filter((e) => MESSAGES_EVENT_TYPES.includes(e.event_type)),
          unreadAll: Number(countersRow?.unread_all ?? 0),
          unreadMessages: Number(countersRow?.unread_messages ?? 0),
          byPatient: normalizeByPatient(countersRow?.by_patient),
        });
      } catch (error) {
        console.error("[useAdminNotifications] fetchAll error", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isUpdating: false,
        }));
      }
    },
    [adminUserId],
  );

  const markEventsRead = useCallback(
    async (eventIds: string[]) => {
      const uniqueIds = [...new Set(eventIds.filter(Boolean))];
      if (!adminUserId || uniqueIds.length === 0) return 0;

      const { error } = await supabase.rpc("mark_admin_events_read", {
        p_event_ids: uniqueIds,
      });

      if (error) {
        console.error("[useAdminNotifications] markEventsRead error", error);
        return 0;
      }

      await fetchAll(false);
      return uniqueIds.length;
    },
    [adminUserId, fetchAll],
  );

  const markEventRead = useCallback(
    async (eventId: string) => markEventsRead([eventId]),
    [markEventsRead],
  );

  const collectUnreadEventIds = useCallback(
    async (patientId: string, eventTypes: AdminEventType[]) => {
      const unreadEventIds: string[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase.rpc("get_admin_event_feed", {
          p_scope: "all",
          p_limit: MARK_SCOPE_PAGE_SIZE,
          p_offset: offset,
          p_patient_id: patientId,
          p_event_types: eventTypes,
        });

        if (error) {
          console.error("[useAdminNotifications] collectUnreadEventIds error", error);
          break;
        }

        const rows = (data ?? []) as AdminEventItem[];
        unreadEventIds.push(...rows.filter((item) => !item.is_read).map((item) => item.id));

        if (rows.length < MARK_SCOPE_PAGE_SIZE) break;
        offset += MARK_SCOPE_PAGE_SIZE;
      }

      return unreadEventIds;
    },
    [],
  );

  const markPatientMessagesRead = useCallback(
    async (patientId: string) => {
      const ids = await collectUnreadEventIds(patientId, MESSAGES_EVENT_TYPES);
      return markEventsRead(ids);
    },
    [collectUnreadEventIds, markEventsRead],
  );

  const markPatientInterviewRead = useCallback(
    async (patientId: string) => {
      const ids = await collectUnreadEventIds(patientId, ["interview_sent", "interview_draft_updated"]);
      return markEventsRead(ids);
    },
    [collectUnreadEventIds, markEventsRead],
  );

  // Stable ref so the polling effect never needs fetchAll in its dep array.
  const fetchAllRef = useRef(fetchAll);
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }); // no deps — runs on every render, only updates the ref

  // Single effect: initial fetch + periodic polling + focus/visibility listeners.
  // Uses module-level singletons (_intervalId, _focusHandler, _visibilityHandler,
  // _lastFetchTs) so that Vite HMR hot-swaps and any unexpected remounts never
  // accumulate duplicate intervals or duplicate event listeners.
  useEffect(() => {
    // undefined = auth still loading — skip entirely.
    if (adminUserId === undefined) return;

    const DEDUP_MS = 5_000;

    // Always tear down whatever is currently running before we set up fresh
    // listeners.  This is the key to preventing interval accumulation on HMR.
    _teardownListeners();

    const call = (initialLoad: boolean) => {
      _lastFetchTs = Date.now();
      return fetchAllRef.current(initialLoad);
    };

    // Only fire the initial fetch if we haven't fetched recently.
    if (Date.now() - _lastFetchTs >= DEDUP_MS) {
      void call(true);
    }

    // null = logged out → don't start polling; just leave listeners torn down.
    if (!adminUserId) return;

    _focusHandler = () => {
      if (Date.now() - _lastFetchTs >= DEDUP_MS) void call(false);
    };
    _visibilityHandler = () => {
      if (document.visibilityState === "visible" && Date.now() - _lastFetchTs >= DEDUP_MS) {
        void call(false);
      }
    };

    _intervalId = window.setInterval(() => void call(false), POLL_INTERVAL_MS);
    window.addEventListener("focus", _focusHandler);
    document.addEventListener("visibilitychange", _visibilityHandler);

    return _teardownListeners;
  }, [adminUserId]); // fetchAll intentionally omitted — ref above keeps it current

  const byPatientMap = useMemo(() => {
    return state.byPatient.reduce<Record<string, { unread_messages: number; unread_interviews: number }>>(
      (acc, row) => {
        acc[row.patient_id] = {
          unread_messages: row.unread_messages,
          unread_interviews: row.unread_interviews,
        };
        return acc;
      },
      {},
    );
  }, [state.byPatient]);

  return {
    ...state,
    byPatientMap,
    refresh: fetchAll,
    markEventRead,
    markEventsRead,
    markPatientMessagesRead,
    markPatientInterviewRead,
  };
};
