-- The Aurelia: post-stay Google review request emails (Google Business Profile, Level 1).
--
-- Flow: front desk marks a reservation CHECKED_OUT -> this trigger queues one review request
-- (send_at = check-out + 3 hours) -> /api/cron/review-requests sends the email with the hotel's
-- official Google review link. Staff can also send or resend manually from Admin -> Reservations.
--
-- Google policy: every checked-out guest receives the same request. No filtering by satisfaction
-- ("review gating") and no incentives. Requests are only queued when the guest gave
-- essential-contact consent on the booking form.
--
-- Apply after 202611180002_scheduler_pg_cron_trigger.sql. The two Vault secrets created for
-- that migration (aurelia_site_url, aurelia_cron_secret) are reused here.

create table if not exists guest_review_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id) on delete cascade,
  guest_email text not null,
  send_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
  source text not null default 'AUTO' check (source in ('AUTO','MANUAL')),
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists guest_review_requests_due_idx on guest_review_requests(send_at) where status = 'PENDING';

alter table guest_review_requests enable row level security;
-- All access goes through authenticated Next.js routes using the service role.
revoke all on guest_review_requests from anon, authenticated;
grant all on guest_review_requests to service_role;

-- Queue a request automatically when a stay is checked out.
create or replace function queue_guest_review_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if new.status = 'CHECKED_OUT' and old.status is distinct from 'CHECKED_OUT' and new.transactional_contact_consent then
    select email into v_email from guests where id = new.guest_id;
    if v_email is not null and position('@' in v_email) > 1 then
      insert into guest_review_requests (reservation_id, guest_email, send_at, source)
      values (new.id, lower(v_email), now() + interval '3 hours', 'AUTO')
      on conflict (reservation_id) do nothing;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists reservations_queue_review_request on reservations;
create trigger reservations_queue_review_request
  after update of status on reservations
  for each row execute function queue_guest_review_request();

-- Send due review requests every 15 minutes (same Vault secrets as the scheduler reminders).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'aurelia-review-requests';
select cron.schedule(
  'aurelia-review-requests',
  '*/15 * * * *',
  $job$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'aurelia_site_url')
           || '/api/cron/review-requests',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aurelia_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $job$
);
