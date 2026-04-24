SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN
INSERT INTO public.profiles (id, email, full_name)
VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."anticipo_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anticipo_id" "uuid",
    "descripcion" "text",
    "monto_estimado" numeric
);
ALTER TABLE "public"."anticipo_items" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."anticipos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "solicitante_id" "uuid",
    "monto_total" numeric NOT NULL,
    "monto_letras" "text",
    "motivo" "text",
    "status" "text" DEFAULT 'borrador'::"text",
    "banco_info" "jsonb",
    "motivo_rechazo" "text",
    "fecha_pago" "date",
    "comprobante_id" "text",
    "cargo" "text",
    "tipo_documento" "text",
    "numero_documento" "text",
    "contacto" "text",
    "fecha_ejecucion" "date",
    "proyecto" "text",
    "banco_nombre" "text",
    "banco_tipo_cuenta" "text",
    "banco_numero_cuenta" "text",
    "firma_base64" "text",
    "observaciones" "text"
);
ALTER TABLE "public"."anticipos" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."centros_costos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "programa" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."centros_costos" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."configuracion_flujos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "programa" "text" NOT NULL,
    "steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);
ALTER TABLE "public"."configuracion_flujos" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "cedula" "text",
    "cargo" "text",
    "banco" "text",
    "tipo_cuenta" "text",
    "numero_cuenta" "text",
    "telefono" "text",
    "rol" "text" DEFAULT 'usuario'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'Solicitante'::"text",
    "programa" "text",
    "region" "text",
    "centro_costos_id" "uuid"
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
ALTER TABLE ONLY "public"."anticipo_items"
ADD CONSTRAINT "anticipo_items_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."anticipos"
ADD CONSTRAINT "anticipos_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."centros_costos"
ADD CONSTRAINT "centros_costos_codigo_key" UNIQUE ("codigo");
ALTER TABLE ONLY "public"."centros_costos"
ADD CONSTRAINT "centros_costos_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."configuracion_flujos"
ADD CONSTRAINT "configuracion_flujos_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."configuracion_flujos"
ADD CONSTRAINT "configuracion_flujos_programa_key" UNIQUE ("programa");
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE
UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();
ALTER TABLE ONLY "public"."anticipo_items"
ADD CONSTRAINT "anticipo_items_anticipo_id_fkey" FOREIGN KEY ("anticipo_id") REFERENCES "public"."anticipos"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."anticipos"
ADD CONSTRAINT "anticipos_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_centro_costos_id_fkey" FOREIGN KEY ("centro_costos_id") REFERENCES "public"."centros_costos"("id");
ALTER TABLE ONLY "public"."profiles"
ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
CREATE POLICY "Admins can manage flows" ON "public"."configuracion_flujos" USING (
    (
        EXISTS (
            SELECT 1
            FROM "public"."profiles"
            WHERE (
                    ("profiles"."id" = "auth"."uid"())
                    AND (
                        "profiles"."role" = 'Administrador Global'::"text"
                    )
                )
        )
    )
);
CREATE POLICY "Insertar perfil propio" ON "public"."profiles" FOR
INSERT WITH CHECK (("auth"."uid"() = "id"));
CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR
SELECT USING (true);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON "public"."profiles" FOR
UPDATE USING (("auth"."uid"() = "id"));
CREATE POLICY "Usuarios pueden ver su propio perfil" ON "public"."profiles" FOR
SELECT USING (("auth"."uid"() = "id"));
ALTER TABLE "public"."centros_costos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."configuracion_flujos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
GRANT ALL ON TABLE "public"."anticipo_items" TO "anon";
GRANT ALL ON TABLE "public"."anticipo_items" TO "authenticated";
GRANT ALL ON TABLE "public"."anticipo_items" TO "service_role";
GRANT ALL ON TABLE "public"."anticipos" TO "anon";
GRANT ALL ON TABLE "public"."anticipos" TO "authenticated";
GRANT ALL ON TABLE "public"."anticipos" TO "service_role";
GRANT ALL ON TABLE "public"."centros_costos" TO "anon";
GRANT ALL ON TABLE "public"."centros_costos" TO "authenticated";
GRANT ALL ON TABLE "public"."centros_costos" TO "service_role";
GRANT ALL ON TABLE "public"."configuracion_flujos" TO "anon";
GRANT ALL ON TABLE "public"."configuracion_flujos" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracion_flujos" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
GRANT ALL ON TABLES TO "service_role";