create table if not exists craft_groups (
  id text primary key,
  user_id text not null,
  name text not null,
  summary text not null default '',
  craft_count integer not null default 0,
  payload text not null,
  updated_at timestamptz not null default now()
);

create index if not exists craft_groups_user_idx on craft_groups (user_id, updated_at desc);
