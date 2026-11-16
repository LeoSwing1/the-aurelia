-- Default published nightly base rates supplied by hotel management.
-- Room Inventory remains editable by SUPER_ADMIN and GENERAL_MANAGER.
update public.room_types
set base_rate = case
  when lower(code) = 'deluxe' then 2500
  when lower(code) = 'executive' then 3000
  else base_rate
end
where lower(code) in ('deluxe', 'executive');
