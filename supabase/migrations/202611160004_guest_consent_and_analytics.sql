-- Guest communication consent and audit trail. Marketing consent is separate from essential stay updates.
alter table public.reservations
  add column if not exists transactional_contact_consent boolean not null default false,
  add column if not exists email_marketing_consent boolean not null default false,
  add column if not exists whatsapp_marketing_consent boolean not null default false,
  add column if not exists sms_marketing_consent boolean not null default false,
  add column if not exists marketing_consent_recorded_at timestamptz,
  add column if not exists marketing_consent_source text;

comment on column public.reservations.transactional_contact_consent is 'Guest permission to contact them about this reservation and stay; not marketing permission.';
comment on column public.reservations.email_marketing_consent is 'Optional opt-in to promotional email.';
comment on column public.reservations.whatsapp_marketing_consent is 'Optional opt-in to promotional WhatsApp messages.';
comment on column public.reservations.sms_marketing_consent is 'Optional opt-in to promotional SMS.';
