-- Auto-confirm e-mail for every newly created auth user

CREATE OR REPLACE FUNCTION public.auto_confirm_new_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_new_auth_user_email ON auth.users;

CREATE TRIGGER trg_auto_confirm_new_auth_user_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_auth_user_email();
