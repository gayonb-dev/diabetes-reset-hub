DROP INDEX IF EXISTS public.blood_sugar_readings_dexcom_extid;

CREATE UNIQUE INDEX IF NOT EXISTS blood_sugar_readings_source_extid
  ON public.blood_sugar_readings (member_id, source, external_id);