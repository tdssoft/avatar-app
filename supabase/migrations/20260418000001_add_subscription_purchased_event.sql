ALTER TABLE admin_events DROP CONSTRAINT IF EXISTS admin_events_event_type_check;
ALTER TABLE admin_events ADD CONSTRAINT admin_events_event_type_check
  CHECK (event_type IN ('patient_question', 'support_ticket', 'interview_sent', 'new_registration', 'interview_draft_updated', 'subscription_purchased'));
