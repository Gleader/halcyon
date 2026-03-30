-- Halcyon — Supabase schema
-- Paste this into Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Searches table: one row per search session
create table searches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  brief jsonb not null,          -- {propertyType, location, radius, budgetMin, budgetMax, areaMin, areaMax, ...}
  portals_searched text[],       -- ['Otodom.pl', 'OLX.pl', ...]
  total_listings int default 0,
  total_queries int default 0,
  duration_s int,                -- total search time in seconds
  benchmark jsonb,               -- aggregate benchmark data
  notes text
);

-- Listings table: one row per property found
create table listings (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references searches(id) on delete cascade,
  created_at timestamptz default now(),
  name text,
  address text,
  location text,
  price_total numeric,
  price_sqm numeric,
  area_sqm numeric,
  land_sqm numeric,
  rooms int,
  floor text,
  year_built int,
  condition text,                -- ready, renovate, developer, unknown
  portal text,
  url text,
  search_url text,
  listing_status text,           -- active, archived, unknown
  archive_note text,
  match_score numeric,
  verified boolean default false,
  match_assessment jsonb,        -- {budget_ok, area_ok, location_ok, overall}
  rcn_benchmark jsonb,           -- per-listing benchmark data
  rcn_vs_market text,            -- fair, above, below
  highlights text[],
  caveats text[],
  raw_data jsonb                 -- full original listing data
);

-- Enable Row Level Security (open access — personal tool)
alter table searches enable row level security;
alter table listings enable row level security;

-- Allow all operations (single-user personal tool)
create policy "Allow all on searches" on searches for all using (true) with check (true);
create policy "Allow all on listings" on listings for all using (true) with check (true);

-- Indexes
create index idx_listings_search on listings(search_id);
create index idx_listings_location on listings(location);
create index idx_listings_status on listings(listing_status);
create index idx_searches_created on searches(created_at desc);
