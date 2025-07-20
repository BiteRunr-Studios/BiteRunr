ALTER TABLE "items" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "items_search_vector_idx" ON "items" USING GIN ("search_vector");

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON items FOR EACH ROW EXECUTE FUNCTION items_search_vector_update();