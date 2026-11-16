create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$ begin
  create type reservation_status as enum ('PENDING_APPROVAL','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN','CHECKED_OUT','REJECTED','CANCELLED','EXPIRED','NO_SHOW');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_status as enum ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type event_enquiry_status as enum ('NEW','CONTACTED','QUOTATION_SENT','ACCEPTED','CONFIRMED','DECLINED','CANCELLED');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'RECEPTION' check (role in ('SUPER_ADMIN','GENERAL_MANAGER','RECEPTION','EVENT_MANAGER','HOUSEKEEPING','FINANCE')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_types (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  total_inventory integer not null check (total_inventory >= 0),
  max_adults integer not null default 2,
  max_children integer not null default 1,
  base_rate numeric(12,2),
  currency text not null default 'INR',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into room_types(code,name,total_inventory,max_adults,max_children)
values ('deluxe','Deluxe',40,2,2),('executive','Executive',2,2,2)
on conflict(code) do nothing;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references room_types(id),
  room_number text unique not null,
  floor text,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','OCCUPIED','DIRTY','CLEANING','INSPECTED','MAINTENANCE','INACTIVE')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists guests_email_phone_idx on guests(lower(email),phone);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  booking_reference text unique not null default ('AUR-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
  guest_id uuid not null references guests(id),
  room_type_id uuid not null references room_types(id),
  check_in date not null,
  check_out date not null,
  adults integer not null check(adults > 0),
  children integer not null default 0 check(children >= 0),
  room_quantity integer not null default 1 check(room_quantity between 1 and 5),
  special_requests text,
  status reservation_status not null default 'PENDING_APPROVAL',
  payment_status payment_status not null default 'PENDING',
  total_amount numeric(12,2),
  currency text not null default 'INR',
  approved_at timestamptz,
  payment_expires_at timestamptz,
  confirmed_at timestamptz,
  source text not null default 'WEBSITE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_dates_valid check(check_out > check_in)
);
create index if not exists reservations_dates_idx on reservations(room_type_id,check_in,check_out,status);
create index if not exists reservations_payment_expiry_idx on reservations(payment_expires_at) where status='AWAITING_PAYMENT';

create table if not exists reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  old_status reservation_status,
  new_status reservation_status not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id),
  provider text not null,
  provider_order_id text unique,
  provider_payment_id text unique,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'CREATED',
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create table if not exists event_enquiries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  event_type text not null,
  event_date date not null,
  guest_count integer not null check(guest_count > 0),
  preferred_venue text,
  message text,
  status event_enquiry_status not null default 'NEW',
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_quotations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references event_enquiries(id) on delete cascade,
  version integer not null default 1,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  valid_until date,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT' check(status in ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique(enquiry_id,version)
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  capacity integer,
  area_sqft numeric(12,2),
  notes text,
  active boolean not null default true
);
insert into venues(name,capacity,area_sqft,notes) values
('Ground-floor banquet',null,76000,'Area is client-provided and must be verified before publication.'),
('Second-floor banquet',200,null,'Capacity supplied by hotel management; verify.'),
('Conference room',30,null,'Capacity supplied by hotel management; verify.'),
('Restaurant',300,null,'Capacity supplied by hotel management; verify.'),
('Poolside garden',500,null,'Capacity supplied by hotel management; verify.')
on conflict(name) do nothing;

create table if not exists contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  enquiry_type text not null default 'General enquiry',
  message text,
  status text not null default 'NEW' check(status in ('NEW','CONTACTED','CLOSED','SPAM')),
  created_at timestamptz not null default now()
);


create table if not exists reservation_room_assignments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  room_id uuid not null references rooms(id),
  stay_period daterange not null,
  assigned_by uuid references profiles(id),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  constraint room_assignment_valid_period check(not isempty(stay_period)),
  exclude using gist (room_id with =, stay_period with &&) where (released_at is null)
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references reservations(id),
  event_enquiry_id uuid references event_enquiries(id),
  invoice_number text unique not null,
  subtotal numeric(12,2) not null,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  currency text not null default 'INR',
  status text not null default 'ISSUED' check(status in ('DRAFT','ISSUED','PAID','VOID','REFUNDED')),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check(reservation_id is not null or event_enquiry_id is not null)
);
create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null,
  tax_rate numeric(5,2) not null default 0,
  line_total numeric(12,2) not null
);
create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid not null references payment_transactions(id),
  provider_refund_id text unique,
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'PENDING' check(status in ('PENDING','PROCESSED','FAILED')),
  created_at timestamptz not null default now()
);
create table if not exists housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  task_type text not null default 'CLEANING',
  status text not null default 'OPEN' check(status in ('OPEN','IN_PROGRESS','DONE','INSPECTED')),
  assigned_to uuid references profiles(id),
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  title text not null,
  description text,
  priority text not null default 'NORMAL' check(priority in ('LOW','NORMAL','HIGH','URGENT')),
  status text not null default 'OPEN' check(status in ('OPEN','IN_PROGRESS','RESOLVED','CANCELLED')),
  reported_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table if not exists event_bookings (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references event_enquiries(id),
  quotation_id uuid references event_quotations(id),
  venue_id uuid references venues(id),
  event_start timestamptz not null,
  event_end timestamptz not null,
  agreed_amount numeric(12,2) not null,
  status text not null default 'TENTATIVE' check(status in ('TENTATIVE','CONFIRMED','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now(),
  check(event_end>event_start)
);
create table if not exists event_payment_schedule (
  id uuid primary key default gen_random_uuid(),
  event_booking_id uuid not null references event_bookings(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null,
  due_at date,
  status text not null default 'PENDING' check(status in ('PENDING','PAID','OVERDUE','WAIVED'))
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function create_reservation_request(
  p_guest_name text, p_guest_email text, p_guest_phone text,
  p_room_type_code text, p_check_in date, p_check_out date,
  p_adults integer, p_children integer, p_room_quantity integer,
  p_special_requests text default ''
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_guest_id uuid; v_type room_types; v_res reservations;
begin
  if p_check_in < current_date or p_check_out <= p_check_in then raise exception 'Choose valid future arrival and departure dates.'; end if;
  if p_room_quantity < 1 or p_room_quantity > 5 then raise exception 'Room quantity must be between 1 and 5.'; end if;
  select * into v_type from room_types where code=p_room_type_code and active=true for update;
  if not found then raise exception 'Selected room category is unavailable.'; end if;
  if p_adults > v_type.max_adults*p_room_quantity or p_children > v_type.max_children*p_room_quantity then raise exception 'Guest count exceeds the selected room category capacity.'; end if;
  insert into guests(full_name,email,phone) values(trim(p_guest_name),lower(trim(p_guest_email)),trim(p_guest_phone))
  on conflict (lower(email),phone) do update set full_name=excluded.full_name returning id into v_guest_id;
  insert into reservations(guest_id,room_type_id,check_in,check_out,adults,children,room_quantity,special_requests)
  values(v_guest_id,v_type.id,p_check_in,p_check_out,p_adults,p_children,p_room_quantity,left(coalesce(p_special_requests,''),2000))
  returning * into v_res;
  insert into reservation_status_history(reservation_id,new_status,note) values(v_res.id,'PENDING_APPROVAL','Website request submitted; availability is rechecked at manager approval.');
  return jsonb_build_object('id',v_res.id,'booking_reference',v_res.booking_reference,'status',v_res.status);
end $$;

create or replace function approve_reservation(p_reservation_id uuid,p_total_amount numeric,p_actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res reservations; v_type room_types; v_day date; v_used integer;
begin
  select * into v_res from reservations where id=p_reservation_id for update;
  if not found or v_res.status <> 'PENDING_APPROVAL' then raise exception 'Reservation is not pending approval.'; end if;
  select * into v_type from room_types where id=v_res.room_type_id for update;
  if p_total_amount is null or p_total_amount <= 0 then raise exception 'A valid full-payment amount is required.'; end if;
  for v_day in select generate_series(v_res.check_in,v_res.check_out-1,interval '1 day')::date loop
    select coalesce(sum(room_quantity),0) into v_used from reservations
    where room_type_id=v_res.room_type_id and id<>v_res.id
      and check_in <= v_day and check_out > v_day
      and (status='CONFIRMED' or status='CHECKED_IN' or (status='AWAITING_PAYMENT' and payment_expires_at > now()));
    if v_used + v_res.room_quantity > v_type.total_inventory then raise exception 'Insufficient category inventory for %; choose other dates.',v_day; end if;
  end loop;
  update reservations set status='AWAITING_PAYMENT',payment_status='PENDING',total_amount=p_total_amount,
    approved_at=now(),payment_expires_at=now()+interval '24 hours',updated_at=now()
  where id=v_res.id returning * into v_res;
  insert into reservation_status_history(reservation_id,old_status,new_status,changed_by,note)
  values(v_res.id,'PENDING_APPROVAL','AWAITING_PAYMENT',p_actor,'Manager approved; full payment due within 24 hours.');
  return jsonb_build_object('id',v_res.id,'booking_reference',v_res.booking_reference,'payment_expires_at',v_res.payment_expires_at);
end $$;


create or replace function expire_reservation_holds()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 with expired as (
   update reservations set status='EXPIRED',updated_at=now()
   where status='AWAITING_PAYMENT' and payment_expires_at<=now()
   returning id
 )
 insert into reservation_status_history(reservation_id,old_status,new_status,note)
 select id,'AWAITING_PAYMENT','EXPIRED','Automatic expiry after 24-hour payment window.' from expired;
 get diagnostics v_count = row_count;
 return v_count;
end $$;

create or replace function mark_reservation_paid(p_reservation_id uuid,p_provider_payment_id text,p_amount numeric)
returns void language plpgsql security definer set search_path=public as $$
declare v_res reservations;
begin
  select * into v_res from reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found.'; end if;
  if v_res.status='CONFIRMED' and v_res.payment_status='PAID' then return; end if;
  if v_res.status <> 'AWAITING_PAYMENT' or v_res.payment_expires_at <= now() then
    update reservations set status='EXPIRED',updated_at=now() where id=v_res.id and status='AWAITING_PAYMENT';
    raise exception 'Payment window expired; reservation was not confirmed.';
  end if;
  if round(v_res.total_amount,2) <> round(p_amount,2) then raise exception 'Payment amount does not match reservation total.'; end if;
  update reservations set status='CONFIRMED',payment_status='PAID',confirmed_at=now(),updated_at=now() where id=v_res.id;
  update payment_transactions set provider_payment_id=p_provider_payment_id,status='CAPTURED'
    where reservation_id=v_res.id and status='CREATED';
  insert into reservation_status_history(reservation_id,old_status,new_status,note)
  values(v_res.id,'AWAITING_PAYMENT','CONFIRMED','Full payment verified by payment webhook.');
end $$;


create or replace function check_room_availability(p_room_type_code text,p_check_in date,p_check_out date,p_quantity integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_type room_types; v_day date; v_used integer; v_min_available integer;
begin
 if p_check_in < current_date or p_check_out <= p_check_in or p_quantity < 1 then raise exception 'Invalid availability search.'; end if;
 select * into v_type from room_types where code=p_room_type_code and active=true;
 if not found then raise exception 'Room category not found.'; end if;
 v_min_available:=v_type.total_inventory;
 for v_day in select generate_series(p_check_in,p_check_out-1,interval '1 day')::date loop
   select coalesce(sum(room_quantity),0) into v_used from reservations
   where room_type_id=v_type.id and check_in<=v_day and check_out>v_day
    and (status='CONFIRMED' or status='CHECKED_IN' or (status='AWAITING_PAYMENT' and payment_expires_at>now()));
   v_min_available:=least(v_min_available,v_type.total_inventory-v_used);
 end loop;
 return jsonb_build_object('available',v_min_available>=p_quantity,'available_quantity',greatest(v_min_available,0),'room_type',v_type.name);
end $$;

alter table profiles enable row level security;
alter table room_types enable row level security;
alter table rooms enable row level security;
alter table guests enable row level security;
alter table reservations enable row level security;
alter table reservation_status_history enable row level security;
alter table payment_transactions enable row level security;
alter table event_enquiries enable row level security;
alter table event_quotations enable row level security;
alter table venues enable row level security;
alter table audit_logs enable row level security;
alter table contact_enquiries enable row level security;
alter table reservation_room_assignments enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table refunds enable row level security;
alter table housekeeping_tasks enable row level security;
alter table maintenance_requests enable row level security;
alter table event_bookings enable row level security;
alter table event_payment_schedule enable row level security;

create policy "Public can read active room types" on room_types for select to anon,authenticated using(active);
create policy "Public can read active venues" on venues for select to anon,authenticated using(active);
create policy "Staff can read own profile" on profiles for select to authenticated using(id=auth.uid());
-- Profile role changes are service-role/admin-only; do not allow self-service role updates.
revoke all on function expire_reservation_holds() from public,anon,authenticated;
grant execute on function expire_reservation_holds() to service_role;
revoke all on function check_room_availability(text,date,date,integer) from public,anon,authenticated;
grant execute on function check_room_availability(text,date,date,integer) to service_role;
revoke all on function create_reservation_request(text,text,text,text,date,date,integer,integer,integer,text) from public,anon,authenticated;
revoke all on function approve_reservation(uuid,numeric,uuid) from public,anon,authenticated;
revoke all on function mark_reservation_paid(uuid,text,numeric) from public,anon,authenticated;
grant execute on function create_reservation_request(text,text,text,text,date,date,integer,integer,integer,text) to service_role;
grant execute on function approve_reservation(uuid,numeric,uuid) to service_role;
grant execute on function mark_reservation_paid(uuid,text,numeric) to service_role;

-- In-app operational notifications. All writes are server-side/service-role only.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null check (category in ('RESERVATION','EVENT','CONTACT','PAYMENT','SYSTEM')),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on notifications(created_at desc);
alter table notifications enable row level security;

-- Configurable rates and taxes; no unapproved amounts are seeded.
create table if not exists room_rates (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references room_types(id) on delete cascade,
  rate_name text not null default 'Standard',
  nightly_rate numeric(12,2) not null check(nightly_rate >= 0),
  currency text not null default 'INR',
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check(valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists room_rates_lookup_idx on room_rates(room_type_id,active,valid_from,valid_to);
create table if not exists tax_configurations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_percent numeric(6,3) not null check(rate_percent >= 0 and rate_percent <= 100),
  applies_to text not null check(applies_to in ('ROOM','EVENT','ALL')),
  active boolean not null default false,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now()
);
alter table room_rates enable row level security;
alter table tax_configurations enable row level security;

-- Keep the staff role model extensible without enabling self-service role changes.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('SUPER_ADMIN','GENERAL_MANAGER','RECEPTION','EVENT_MANAGER','HOUSEKEEPING','FINANCE','RESTAURANT_STAFF'));

create or replace function aurelia_notify() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='reservations' then
    insert into notifications(title,body,category,entity_type,entity_id)
    values('New room reservation request', 'A guest submitted reservation '||new.booking_reference||' for '||new.check_in||' to '||new.check_out||'.', 'RESERVATION','reservation',new.id);
  elsif tg_table_name='event_enquiries' then
    insert into notifications(title,body,category,entity_type,entity_id)
    values('New event enquiry', new.guest_name||' submitted a '||new.event_type||' enquiry for '||new.event_date||'.', 'EVENT','event_enquiry',new.id);
  elsif tg_table_name='contact_enquiries' then
    insert into notifications(title,body,category,entity_type,entity_id)
    values('New website enquiry', new.guest_name||' sent a '||new.enquiry_type||'.', 'CONTACT','contact_enquiry',new.id);
  end if;
  return new;
end $$;
drop trigger if exists notify_new_reservation on reservations;
create trigger notify_new_reservation after insert on reservations for each row execute function aurelia_notify();
drop trigger if exists notify_new_event_enquiry on event_enquiries;
create trigger notify_new_event_enquiry after insert on event_enquiries for each row execute function aurelia_notify();
drop trigger if exists notify_new_contact_enquiry on contact_enquiries;
create trigger notify_new_contact_enquiry after insert on contact_enquiries for each row execute function aurelia_notify();

create or replace function assign_reservation_room(p_reservation_id uuid,p_room_id uuid,p_actor uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_res reservations; v_room rooms; v_assignment uuid; v_assigned integer;
begin
  select * into v_res from reservations where id=p_reservation_id for update;
  if not found or v_res.status not in ('CONFIRMED','CHECKED_IN') then raise exception 'Only confirmed reservations can be assigned a physical room.'; end if;
  select * into v_room from rooms where id=p_room_id and active=true and status in ('AVAILABLE','INSPECTED') for update;
  if not found then raise exception 'Selected physical room is not available for assignment.'; end if;
  if v_room.room_type_id<>v_res.room_type_id then raise exception 'Physical room category does not match reservation category.'; end if;
  select count(*) into v_assigned from reservation_room_assignments where reservation_id=v_res.id and released_at is null;
  if v_assigned >= v_res.room_quantity then raise exception 'All rooms requested for this reservation are already assigned.'; end if;
  insert into reservation_room_assignments(reservation_id,room_id,stay_period,assigned_by)
  values(v_res.id,v_room.id,daterange(v_res.check_in,v_res.check_out,'[)'),p_actor) returning id into v_assignment;
  return v_assignment;
end $$;
revoke all on function assign_reservation_room(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function assign_reservation_room(uuid,uuid,uuid) to service_role;


create or replace function aurelia_reservation_status_notify() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status then
  insert into notifications(title,body,category,entity_type,entity_id)
  values('Reservation status updated', 'Reservation '||new.booking_reference||' changed from '||old.status||' to '||new.status||'.', 'RESERVATION','reservation',new.id);
 end if;
 return new;
end $$;
drop trigger if exists notify_reservation_status_change on reservations;
create trigger notify_reservation_status_change after update of status on reservations for each row execute function aurelia_reservation_status_notify();

-- Supabase Storage buckets: public marketing imagery; private guest documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('hotel-gallery','hotel-gallery',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']),
 ('room-images','room-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']),
 ('guest-documents','guest-documents',false,15728640,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;

drop policy if exists "Public can view hotel gallery" on storage.objects;
create policy "Public can view hotel gallery" on storage.objects for select to anon,authenticated using(bucket_id in ('hotel-gallery','room-images'));
drop policy if exists "Hotel staff manage marketing images" on storage.objects;
create policy "Hotel staff manage marketing images" on storage.objects for all to authenticated
using(bucket_id in ('hotel-gallery','room-images') and exists(select 1 from profiles p where p.id=auth.uid() and p.active and p.role in ('SUPER_ADMIN','GENERAL_MANAGER')))
with check(bucket_id in ('hotel-gallery','room-images') and exists(select 1 from profiles p where p.id=auth.uid() and p.active and p.role in ('SUPER_ADMIN','GENERAL_MANAGER')));
drop policy if exists "Authorised staff access guest documents" on storage.objects;
create policy "Authorised staff access guest documents" on storage.objects for select to authenticated
using(bucket_id='guest-documents' and exists(select 1 from profiles p where p.id=auth.uid() and p.active and p.role in ('SUPER_ADMIN','GENERAL_MANAGER','RECEPTION','FINANCE')));
drop policy if exists "Managers upload guest documents" on storage.objects;
create policy "Managers upload guest documents" on storage.objects for insert to authenticated
with check(bucket_id='guest-documents' and exists(select 1 from profiles p where p.id=auth.uid() and p.active and p.role in ('SUPER_ADMIN','GENERAL_MANAGER','RECEPTION')));


create or replace function transition_reservation_status(p_reservation_id uuid,p_new_status reservation_status,p_actor uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res reservations; v_assigned integer; v_old reservation_status;
begin
 select * into v_res from reservations where id=p_reservation_id for update;
 if not found then raise exception 'Reservation not found.'; end if;
 v_old:=v_res.status;
 if p_new_status='CHECKED_IN' then
   if v_old<>'CONFIRMED' or v_res.payment_status<>'PAID' then raise exception 'Only fully paid confirmed reservations can check in.'; end if;
   select count(*) into v_assigned from reservation_room_assignments where reservation_id=v_res.id and released_at is null;
   if v_assigned<v_res.room_quantity then raise exception 'Assign all physical rooms before check-in.'; end if;
   update rooms set status='OCCUPIED' where id in(select room_id from reservation_room_assignments where reservation_id=v_res.id and released_at is null);
 elsif p_new_status='CHECKED_OUT' then
   if v_old<>'CHECKED_IN' then raise exception 'Only checked-in reservations can check out.'; end if;
   update rooms set status='DIRTY' where id in(select room_id from reservation_room_assignments where reservation_id=v_res.id and released_at is null);
   update reservation_room_assignments set released_at=now() where reservation_id=v_res.id and released_at is null;
 elsif p_new_status='CANCELLED' then
   if v_old in ('CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED','REJECTED') then raise exception 'This reservation can no longer be cancelled.'; end if;
   update rooms set status='AVAILABLE' where id in(select room_id from reservation_room_assignments where reservation_id=v_res.id and released_at is null) and status<>'MAINTENANCE';
   update reservation_room_assignments set released_at=now() where reservation_id=v_res.id and released_at is null;
 elsif p_new_status='NO_SHOW' then
   if v_old<>'CONFIRMED' then raise exception 'Only confirmed reservations can be marked no-show.'; end if;
 else
   raise exception 'Unsupported reservation status transition.';
 end if;
 update reservations set status=p_new_status,updated_at=now() where id=v_res.id;
 insert into reservation_status_history(reservation_id,old_status,new_status,changed_by,note) values(v_res.id,v_old,p_new_status,p_actor,'Updated by authorised hotel staff.');
 return jsonb_build_object('id',v_res.id,'status',p_new_status);
end $$;
revoke all on function transition_reservation_status(uuid,reservation_status,uuid) from public,anon,authenticated;
grant execute on function transition_reservation_status(uuid,reservation_status,uuid) to service_role;
