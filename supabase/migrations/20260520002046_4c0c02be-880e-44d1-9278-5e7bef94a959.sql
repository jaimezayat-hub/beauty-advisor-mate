
-- KPI views for Performance & Reports
create or replace view public.v_sales_by_ba_month as
select
  p.brand,
  p.store_id,
  p.ba_id,
  date_trunc('month', p.purchased_at) as month,
  count(*)::int as transactions,
  coalesce(sum(p.total),0)::numeric as sales,
  coalesce(avg(p.total),0)::numeric as avg_ticket
from public.purchases p
where p.deleted_at is null
group by 1,2,3,4;

create or replace view public.v_consumers_by_ba_month as
select
  c.brand,
  c.store_id,
  c.owner_ba_id as ba_id,
  date_trunc('month', c.created_at) as month,
  count(*)::int as new_consumers
from public.consumers c
where c.deleted_at is null
group by 1,2,3,4;

create or replace view public.v_followups_by_ba_month as
select
  f.store_id,
  f.ba_id,
  date_trunc('month', coalesce(f.completed_at, f.due_at)) as month,
  count(*) filter (where f.outcome <> 'pending')::int as completed,
  count(*) filter (where f.outcome = 'pending')::int as pending,
  count(*)::int as total
from public.follow_ups f
group by 1,2,3;

create or replace view public.v_appointments_by_ba_month as
select
  a.brand,
  a.store_id,
  a.ba_id,
  date_trunc('month', a.scheduled_at) as month,
  count(*) filter (where a.status = 'done')::int as completed,
  count(*) filter (where a.status = 'cancelled')::int as cancelled,
  count(*) filter (where a.status = 'no_show')::int as no_show,
  count(*) filter (where a.status = 'pending' or a.status = 'confirmed')::int as upcoming,
  count(*)::int as total
from public.appointments a
group by 1,2,3,4;

create or replace view public.v_samples_by_ba_month as
select
  sd.store_id,
  sd.ba_id,
  date_trunc('month', sd.delivered_at) as month,
  count(*)::int as delivered,
  count(*) filter (where sd.converted_purchase_id is not null)::int as converted
from public.sample_deliveries sd
group by 1,2,3;

-- Views inherit RLS from base tables via security_invoker
alter view public.v_sales_by_ba_month set (security_invoker = on);
alter view public.v_consumers_by_ba_month set (security_invoker = on);
alter view public.v_followups_by_ba_month set (security_invoker = on);
alter view public.v_appointments_by_ba_month set (security_invoker = on);
alter view public.v_samples_by_ba_month set (security_invoker = on);
