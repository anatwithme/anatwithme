-- Migration: Add group_name column to manual groups
-- This script adds the new column and populates existing rows with an empty string.

-- //created on 06/16/2026
alter table public."group"
  add column if not exists group_name text not null default '';

