-- IMC editable manualmente (ya no se calcula automáticamente desde peso y estatura)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bmi NUMERIC;
