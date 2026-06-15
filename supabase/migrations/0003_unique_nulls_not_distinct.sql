-- Postgres treats NULL as distinct in unique constraints by default, so two
-- rows with project_id=NULL never collide and `on conflict` becomes INSERT.
-- That made every re-sync duplicate existing rows. Switch the constraint to
-- NULLS NOT DISTINCT (PG 15+) so NULLs collide with each other.

alter table public.usage_records
  drop constraint if exists usage_records_user_id_provider_model_date_project_id_key;

alter table public.usage_records
  add constraint usage_records_uniq
  unique nulls not distinct (user_id, provider, model, date, project_id);
