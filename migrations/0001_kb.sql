-- Shared knowledge base. Reference data only: no student records are ever stored here.
CREATE TABLE IF NOT EXISTS kb_items (
  kind         TEXT NOT NULL,           -- 'concept' | 'system' | 'district'
  id           TEXT NOT NULL,
  school_year  TEXT NOT NULL,           -- e.g. '2026-27'
  position     INTEGER NOT NULL DEFAULT 0,
  data         TEXT NOT NULL,           -- JSON
  source_title TEXT,
  source_url   TEXT,
  added_on     TEXT NOT NULL,           -- ISO date the fact was added
  PRIMARY KEY (kind, id, school_year)
);
CREATE INDEX IF NOT EXISTS kb_items_year ON kb_items (school_year, kind, position);
