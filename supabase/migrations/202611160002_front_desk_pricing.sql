-- Aurelia front-desk pricing details. Run after 202611160001_initial_hotel_platform.sql.
alter table public.reservations
  add column if not exists pricing_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists front_desk_notes text;

create or replace function public.approve_reservation_detailed(
  p_reservation_id uuid,
  p_total_amount numeric,
  p_actor uuid default null,
  p_pricing_breakdown jsonb default '{}'::jsonb,
  p_front_desk_notes text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_res public.reservations; v_type public.room_types; v_day date; v_used integer;
begin
  select * into v_res from public.reservations where id=p_reservation_id for update;
  if not found or v_res.status <> 'PENDING_APPROVAL' then raise exception 'Reservation is not pending approval.'; end if;
  select * into v_type from public.room_types where id=v_res.room_type_id for update;
  if p_total_amount is null or p_total_amount <= 0 then raise exception 'A valid full-payment amount is required.'; end if;
  for v_day in select generate_series(v_res.check_in,v_res.check_out-1,interval '1 day')::date loop
    select coalesce(sum(room_quantity),0) into v_used from public.reservations
    where room_type_id=v_res.room_type_id and id<>v_res.id
      and check_in <= v_day and check_out > v_day
      and (status='CONFIRMED' or status='CHECKED_IN' or (status='AWAITING_PAYMENT' and payment_expires_at > now()));
    if v_used + v_res.room_quantity > v_type.total_inventory then raise exception 'Insufficient category inventory for %; choose other dates.',v_day; end if;
  end loop;
  update public.reservations set status='AWAITING_PAYMENT',payment_status='PENDING',total_amount=p_total_amount,
    pricing_breakdown=coalesce(p_pricing_breakdown,'{}'::jsonb),front_desk_notes=nullif(left(coalesce(p_front_desk_notes,''),2000),''),
    approved_at=now(),payment_expires_at=now()+interval '24 hours',updated_at=now()
  where id=v_res.id returning * into v_res;
  insert into public.reservation_status_history(reservation_id,old_status,new_status,changed_by,note)
  values(v_res.id,'PENDING_APPROVAL','AWAITING_PAYMENT',p_actor,'Front desk priced and approved; full payment due within 24 hours.');
  insert into public.notifications(title,body,category,entity_type,entity_id)
  values('Reservation approved','Reservation '||v_res.booking_reference||' is awaiting full payment.','RESERVATION','reservation',v_res.id);
  return jsonb_build_object('id',v_res.id,'booking_reference',v_res.booking_reference,'payment_expires_at',v_res.payment_expires_at,'total_amount',v_res.total_amount);
end $$;
revoke all on function public.approve_reservation_detailed(uuid,numeric,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.approve_reservation_detailed(uuid,numeric,uuid,jsonb,text) to service_role;
