
-- Update profiles for demo users
UPDATE public.profiles SET store_id='PH-POL-LAN', region='CS', display_name='BA Lancôme Demo' WHERE id='016abb46-c624-4f0c-892f-abf22456dfb7';
UPDATE public.profiles SET store_id='PH-POL-YSL', region='CS', display_name='BA YSL Demo' WHERE id='697c9775-3fd6-4dbe-8954-63572944bcb2';
UPDATE public.profiles SET region='CS', display_name='Admin Demo' WHERE id='55c10968-6f23-43d3-84ef-7201286e1c1d';

-- Roles: admin gets central_admin (replaces auto-assigned ba)
DELETE FROM public.user_roles WHERE user_id='55c10968-6f23-43d3-84ef-7201286e1c1d';
INSERT INTO public.user_roles(user_id,role) VALUES ('55c10968-6f23-43d3-84ef-7201286e1c1d','central_admin') ON CONFLICT DO NOTHING;

-- Reassign all demo lancome consumers ownership to BA lancome demo
UPDATE public.consumers SET owner_ba_id='016abb46-c624-4f0c-892f-abf22456dfb7'
  WHERE brand='lancome' AND owner_ba_id IS NULL;

-- Add a few YSL demo consumers
INSERT INTO public.consumers(first_name,last_name,email,phone,birthday,gender,brand,store_id,owner_ba_id,segment,doc_id) VALUES
 ('Valentina','Reyes Cruz','valentina.reyes@gmail.com','+52 55 1122 3344','1992-06-15','Femenino','ysl','PH-POL-YSL','697c9775-3fd6-4dbe-8954-63572944bcb2','vip','CON-MX-Y0001'),
 ('Sofía','Lara Méndez','sofia.lara@outlook.com','+52 55 8877 6655','1988-11-02','Femenino','ysl','PH-POL-YSL','697c9775-3fd6-4dbe-8954-63572944bcb2','frecuente','CON-MX-Y0002'),
 ('Mariana','Castillo','mariana.castillo@gmail.com','+52 55 4455 7788','1995-02-20','Femenino','ysl','PH-POL-YSL','697c9775-3fd6-4dbe-8954-63572944bcb2','nuevo','CON-MX-Y0003');

-- Demo purchases for lancome BA (use existing products)
WITH cs AS (SELECT id FROM public.consumers WHERE brand='lancome' LIMIT 5),
     prods AS (SELECT id, sku, name, price FROM public.products WHERE brand='lancome' LIMIT 5)
INSERT INTO public.purchases(consumer_id,ba_id,store_id,brand,total,purchased_at,ticket_number)
SELECT c.id,'016abb46-c624-4f0c-892f-abf22456dfb7','PH-POL-LAN','lancome',
       (random()*3000+1500)::numeric(10,2),
       now() - (random()*60)::int * interval '1 day',
       'PH-POL-' || (1000+floor(random()*9000))::text
FROM cs c;

-- Purchase items (one per purchase)
INSERT INTO public.purchase_items(purchase_id,product_id,sku_snapshot,name_snapshot,qty,unit_price)
SELECT p.id, pr.id, pr.sku, pr.name, 1, pr.price
FROM public.purchases p
CROSS JOIN LATERAL (SELECT id,sku,name,price FROM public.products WHERE brand='lancome' ORDER BY random() LIMIT 1) pr
WHERE p.ba_id='016abb46-c624-4f0c-892f-abf22456dfb7';

-- Demo visits
INSERT INTO public.visits(consumer_id,ba_id,store_id,brand,visited_at,duration_min,notes)
SELECT id,'016abb46-c624-4f0c-892f-abf22456dfb7','PH-POL-LAN','lancome',
       now() - (random()*30)::int * interval '1 day', 20, 'Visita demo'
FROM public.consumers WHERE brand='lancome' LIMIT 6;

-- Demo upcoming appointments
INSERT INTO public.appointments(consumer_id,ba_id,store_id,brand,scheduled_at,type,status,duration_min,notes)
SELECT id,'016abb46-c624-4f0c-892f-abf22456dfb7','PH-POL-LAN','lancome',
       now() + ((row_number() OVER ()) * interval '2 days'),
       'consulta','pending',45,'Cita demo programada'
FROM public.consumers WHERE brand='lancome' LIMIT 4;
