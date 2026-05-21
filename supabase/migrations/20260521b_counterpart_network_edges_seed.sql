-- Seed counterpart_network_edges with realistic developer-contractor-bank
-- relationships so the network graph visualization has data to render.
-- Edges derived from the seed developers' primary_bank + primary_contractors.

begin;

insert into counterpart_network_edges (from_entity_id, from_entity_type, to_entity_id, to_entity_type, relationship_type, strength, stress_contagion_risk) values
  -- AEDAS network
  ('CaixaBank', 'bank', 'DEV-ES-AEDAS', 'developer', 'finances', 0.85, 'medium'),
  ('ACS', 'contractor', 'DEV-ES-AEDAS', 'developer', 'builds_for', 0.7, 'low'),
  ('Sacyr', 'contractor', 'DEV-ES-AEDAS', 'developer', 'builds_for', 0.6, 'low'),
  -- Neinor network
  ('Banco Santander', 'bank', 'DEV-ES-NEINOR', 'developer', 'finances', 0.9, 'medium'),
  ('Acciona', 'contractor', 'DEV-ES-NEINOR', 'developer', 'builds_for', 0.75, 'medium'),
  ('OHL', 'contractor', 'DEV-ES-NEINOR', 'developer', 'builds_for', 0.5, 'medium'),
  -- Metrovacesa (overlap with Santander = bank concentration)
  ('Banco Santander', 'bank', 'DEV-ES-MV', 'developer', 'finances', 0.85, 'high'),
  ('Ferrovial', 'contractor', 'DEV-ES-MV', 'developer', 'builds_for', 0.7, 'low'),
  ('FCC', 'contractor', 'DEV-ES-MV', 'developer', 'builds_for', 0.6, 'low'),
  -- Taylor Wimpey
  ('BBVA', 'bank', 'DEV-ES-TBR', 'developer', 'finances', 0.8, 'low'),
  ('Acciona', 'contractor', 'DEV-ES-TBR', 'developer', 'builds_for', 0.55, 'medium'),
  -- Realia (Sacyr overlap)
  ('Bankinter', 'bank', 'DEV-ES-RP', 'developer', 'finances', 0.7, 'low'),
  ('Sacyr', 'contractor', 'DEV-ES-RP', 'developer', 'builds_for', 0.5, 'low'),
  -- La Cañada (small bank concentration)
  ('Sabadell', 'bank', 'DEV-ES-LACAN', 'developer', 'finances', 0.65, 'medium'),
  -- Mediterranean Build Group (single-bank = stress risk)
  ('Cajamar', 'bank', 'DEV-ES-MED', 'developer', 'finances', 0.95, 'high'),
  -- Torreve (small local cajas)
  ('Cajamar', 'bank', 'DEV-ES-TR', 'developer', 'finances', 0.95, 'high'),
  -- Alicante Coastal (also Cajamar → contagion cluster)
  ('Cajamar', 'bank', 'DEV-ES-AC', 'developer', 'finances', 0.95, 'high'),
  -- Cross-developer legal/financial connections in stressed cluster
  ('DEV-ES-MED', 'developer', 'DEV-ES-AC', 'developer', 'legally_connected', 0.4, 'high'),
  ('DEV-ES-AC', 'developer', 'DEV-ES-AT', 'developer', 'legally_connected', 0.5, 'high')
on conflict do nothing;

commit;
