ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "place_names" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "username_holds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $do$
DECLARE
    role_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
            EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', role_name);
        END IF;
    END LOOP;
END
$do$;--> statement-breakpoint
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'clear-sender-keys',
            '15 19 * * *',
            $job$UPDATE public.drops SET sender_key = NULL, device_key = NULL WHERE created_at < now() - interval '90 days' AND (sender_key IS NOT NULL OR device_key IS NOT NULL)$job$
        );
    END IF;
END
$do$;
