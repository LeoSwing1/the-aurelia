-- The Aurelia: hotel operations calendar and email reminders.
create table if not exists hotel_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  category text not null check (category in ('RESERVATION','GUEST','HOUSEKEEPING','EVENT','STAFF','PAYMENT','OTHER')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  assigned_to text,
  notify_email text not null,
  reminder_minutes_before integer not null default 60 check (reminder_minutes_before between 0 and 10080),
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED','COMPLETED','CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists hotel_schedules_starts_idx on hotel_schedules(starts_at) where status = 'SCHEDULED';

create table if not exists hotel_schedule_reminders (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references hotel_schedules(id) on delete cascade,
  send_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','FAILED','CANCELLED')),
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(schedule_id, send_at)
);
create index if not exists hotel_schedule_reminders_due_idx on hotel_schedule_reminders(send_at) where status = 'PENDING';

alter table hotel_schedules enable row level security;
alter table hotel_schedule_reminders enable row level security;
-- All reads/writes are mediated by authenticated Next.js routes using the service role.
revoke all on hotel_schedules from anon, authenticated;
revoke all on hotel_schedule_reminders from anon, authenticated;
grant all on hotel_schedules to service_role;
grant all on hotel_schedule_reminders to service_role;
