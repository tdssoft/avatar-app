-- Create function to update timestamps (must be first)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles (only admins can view all, users see their own)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add first_name, last_name, phone to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create patients table (admin's view of patients)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'Brak',
    diagnosis_status TEXT DEFAULT 'Brak',
    last_communication_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Patients table RLS - only admins can access
CREATE POLICY "Admins can view all patients"
ON public.patients FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert patients"
ON public.patients FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update patients"
ON public.patients FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patients"
ON public.patients FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create recommendations table
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    created_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    body_systems TEXT[] DEFAULT '{}',
    diagnosis_summary TEXT,
    dietary_recommendations TEXT,
    supplementation_program TEXT,
    shop_links TEXT,
    supporting_therapies TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recommendations"
ON public.recommendations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
ON public.recommendations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

-- Create patient_notes table
CREATE TABLE public.patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage patient notes"
ON public.patient_notes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create patient_messages table (SMS and form questions)
CREATE TABLE public.patient_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id),
    message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'question', 'answer')),
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage patient messages"
ON public.patient_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view and send their own messages
CREATE POLICY "Users can view own messages"
ON public.patient_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can send questions"
ON public.patient_messages FOR INSERT
WITH CHECK (
    message_type = 'question' AND
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

-- Create partner_shop_links table
CREATE TABLE public.partner_shop_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_url TEXT NOT NULL,
    shop_name TEXT,
    added_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.partner_shop_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner links"
ON public.partner_shop_links FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own links"
ON public.partner_shop_links FOR SELECT
USING (partner_user_id = auth.uid());

-- Update trigger for patients
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for recommendations
CREATE TRIGGER update_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();