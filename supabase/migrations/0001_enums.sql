create type host_type as enum ('linked', 'hosted');
create type access_level as enum ('open', 'registration', 'data-use-agreement');
create type dataset_status as enum ('unverified', 'verified', 'flagged');
create type concept_kind as enum ('disease', 'outcome', 'marker');
create type relationship_type as enum ('studies', 'outcome', 'marker');
create type vote_target as enum ('dataset', 'dataset_concept');
