-- Exact-order Razorpay reconciliation with duplicate webhook protection.
-- Run after migrations 001 through 004.
create or replace function public.mark_reservation_paid_v2(
  p_provider_order_id text,
  p_provider_payment_id text,
  p_amount numeric,
  p_currency text,
  p_raw_event jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.payment_transactions;
  v_res public.reservations;
begin
  select * into v_tx
  from public.payment_transactions
  where provider_order_id = p_provider_order_id
  for update;

  if not found then
    raise exception 'Payment order is not recognised.';
  end if;

  if v_tx.status = 'CAPTURED' then
    if v_tx.provider_payment_id = p_provider_payment_id then
      return jsonb_build_object('result', 'DUPLICATE', 'reservation_id', v_tx.reservation_id);
    end if;
    update public.payment_transactions
      set status = 'RECONCILIATION_REQUIRED', raw_event = coalesce(p_raw_event, '{}'::jsonb)
      where id = v_tx.id;
    return jsonb_build_object('result', 'RECONCILIATION_REQUIRED', 'reservation_id', v_tx.reservation_id);
  end if;

  select * into v_res from public.reservations where id = v_tx.reservation_id for update;
  if not found then raise exception 'Reservation for payment order was not found.'; end if;

  if round(coalesce(v_tx.amount, 0), 2) <> round(coalesce(p_amount, 0), 2)
     or upper(coalesce(v_tx.currency, '')) <> upper(coalesce(p_currency, ''))
     or round(coalesce(v_res.total_amount, 0), 2) <> round(coalesce(p_amount, 0), 2)
     or upper(coalesce(v_res.currency, 'INR')) <> upper(coalesce(p_currency, '')) then
    update public.payment_transactions
      set status = 'RECONCILIATION_REQUIRED', provider_payment_id = p_provider_payment_id,
          raw_event = coalesce(p_raw_event, '{}'::jsonb)
      where id = v_tx.id;
    insert into public.notifications(title, body, category, entity_type, entity_id)
      values ('Payment needs reconciliation', 'A captured payment did not match the stored reservation amount or currency. Review payment order ' || p_provider_order_id || '.', 'PAYMENT', 'reservation', v_res.id);
    return jsonb_build_object('result', 'RECONCILIATION_REQUIRED', 'reservation_id', v_res.id);
  end if;

  if v_res.status <> 'AWAITING_PAYMENT'
     or v_res.payment_expires_at is null
     or v_res.payment_expires_at <= now() then
    update public.payment_transactions
      set status = 'LATE_CAPTURED_REVIEW', provider_payment_id = p_provider_payment_id,
          raw_event = coalesce(p_raw_event, '{}'::jsonb)
      where id = v_tx.id;
    insert into public.notifications(title, body, category, entity_type, entity_id)
      values ('Late payment requires review', 'Payment was captured after the reservation hold expired or changed state. Do not auto-confirm; reconcile or refund manually. Order ' || p_provider_order_id || '.', 'PAYMENT', 'reservation', v_res.id);
    return jsonb_build_object('result', 'LATE_PAYMENT_REVIEW', 'reservation_id', v_res.id);
  end if;

  update public.reservations
    set status = 'CONFIRMED', payment_status = 'PAID', confirmed_at = now(), updated_at = now()
    where id = v_res.id;
  update public.payment_transactions
    set provider_payment_id = p_provider_payment_id, status = 'CAPTURED', raw_event = coalesce(p_raw_event, '{}'::jsonb)
    where id = v_tx.id;
  insert into public.reservation_status_history(reservation_id, old_status, new_status, note)
    values (v_res.id, 'AWAITING_PAYMENT', 'CONFIRMED', 'Full payment amount and currency verified against the Razorpay order.');
  insert into public.notifications(title, body, category, entity_type, entity_id)
    values ('Reservation payment confirmed', 'Reservation ' || v_res.booking_reference || ' is fully paid and confirmed.', 'PAYMENT', 'reservation', v_res.id);

  return jsonb_build_object('result', 'CONFIRMED', 'reservation_id', v_res.id, 'booking_reference', v_res.booking_reference);
end;
$$;

revoke all on function public.mark_reservation_paid_v2(text, text, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.mark_reservation_paid_v2(text, text, numeric, text, jsonb) to service_role;
