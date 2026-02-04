-- Dodanie polityki RLS dla adminów na tabelę referrals (SELECT)
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dodanie polityki UPDATE dla adminów (do zmiany statusu)
CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));