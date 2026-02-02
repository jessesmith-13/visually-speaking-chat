drop extension if exists "pg_net";


  create table "public"."event_updates" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_id" uuid not null,
    "title" text not null,
    "message" text not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."event_updates" enable row level security;


  create table "public"."events" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "description" text,
    "host_id" uuid,
    "date" timestamp with time zone not null,
    "duration_minutes" integer not null default 60,
    "max_participants" integer,
    "status" text not null default 'upcoming'::text,
    "image_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "attendees" jsonb default '[]'::jsonb,
    "capacity" smallint,
    "name" text not null,
    "duration" integer not null,
    "price" numeric(10,2) not null default 0,
    "created_by" uuid,
    "event_type" text default 'virtual'::text,
    "venue_name" text,
    "venue_address" text
      );


alter table "public"."events" enable row level security;


  create table "public"."match_history" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_id" uuid not null,
    "user1_id" uuid not null,
    "user2_id" uuid not null,
    "room_id" uuid,
    "started_at" timestamp with time zone default now(),
    "ended_at" timestamp with time zone,
    "duration_seconds" integer
      );


alter table "public"."match_history" enable row level security;


  create table "public"."matchmaking_queue" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_id" uuid not null,
    "user_id" uuid not null,
    "joined_queue_at" timestamp with time zone default now(),
    "is_matched" boolean default false,
    "current_room_id" uuid
      );


alter table "public"."matchmaking_queue" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "display_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_admin" boolean default false,
    "full_name" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."promo_codes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "code" text not null,
    "type" text not null,
    "amount" numeric(10,2) not null default 0,
    "event_id" uuid,
    "max_redemptions" integer not null default 1,
    "redeemed_count" integer not null default 0,
    "expires_at" timestamp with time zone,
    "active" boolean not null default true,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."promo_codes" enable row level security;


  create table "public"."promo_redemptions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "promo_code_id" uuid not null,
    "user_id" uuid not null,
    "event_id" uuid not null,
    "redeemed_at" timestamp with time zone default now()
      );


alter table "public"."promo_redemptions" enable row level security;


  create table "public"."room_participants" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "room_id" uuid not null,
    "user_id" uuid not null,
    "joined_at" timestamp with time zone default now(),
    "left_at" timestamp with time zone,
    "is_active" boolean default true
      );


alter table "public"."room_participants" enable row level security;


  create table "public"."tickets" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_id" uuid not null,
    "user_id" uuid not null,
    "purchased_at" timestamp with time zone default now(),
    "payment_status" text not null default 'pending'::text,
    "payment_amount" numeric(10,2) not null,
    "stripe_payment_id" text,
    "created_at" timestamp with time zone default now(),
    "status" text,
    "amount_paid" numeric(10,2),
    "stripe_payment_intent_id" text,
    "updated_at" timestamp with time zone default now(),
    "check_in_count" integer default 0,
    "last_checked_in_at" timestamp with time zone,
    "source" text not null default 'stripe'::text,
    "promo_code_id" uuid
      );


alter table "public"."tickets" enable row level security;


  create table "public"."video_rooms" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "event_id" uuid not null,
    "room_name" text not null,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone default now(),
    "closed_at" timestamp with time zone,
    "daily_url" text
      );


alter table "public"."video_rooms" enable row level security;

CREATE UNIQUE INDEX event_updates_pkey ON public.event_updates USING btree (id);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE INDEX idx_event_updates_created_at ON public.event_updates USING btree (created_at DESC);

CREATE INDEX idx_event_updates_event_id ON public.event_updates USING btree (event_id);

CREATE INDEX idx_events_date ON public.events USING btree (date);

CREATE INDEX idx_events_host_id ON public.events USING btree (host_id);

CREATE INDEX idx_events_status ON public.events USING btree (status);

CREATE INDEX idx_match_history_event_id ON public.match_history USING btree (event_id);

CREATE INDEX idx_match_history_user1_id ON public.match_history USING btree (user1_id);

CREATE INDEX idx_match_history_user2_id ON public.match_history USING btree (user2_id);

CREATE INDEX idx_matchmaking_queue_event_id ON public.matchmaking_queue USING btree (event_id);

CREATE INDEX idx_matchmaking_queue_is_matched ON public.matchmaking_queue USING btree (is_matched);

CREATE INDEX idx_promo_codes_active ON public.promo_codes USING btree (active);

CREATE INDEX idx_promo_codes_code ON public.promo_codes USING btree (code);

CREATE INDEX idx_promo_codes_event_id ON public.promo_codes USING btree (event_id);

CREATE INDEX idx_promo_redemptions_event_id ON public.promo_redemptions USING btree (event_id);

CREATE INDEX idx_promo_redemptions_promo_code_id ON public.promo_redemptions USING btree (promo_code_id);

CREATE INDEX idx_promo_redemptions_user_id ON public.promo_redemptions USING btree (user_id);

CREATE INDEX idx_room_participants_room_id ON public.room_participants USING btree (room_id);

CREATE INDEX idx_room_participants_user_id ON public.room_participants USING btree (user_id);

CREATE INDEX idx_tickets_check_in ON public.tickets USING btree (last_checked_in_at);

CREATE INDEX idx_tickets_event_id ON public.tickets USING btree (event_id);

CREATE INDEX idx_tickets_payment_status ON public.tickets USING btree (payment_status);

CREATE INDEX idx_tickets_promo_code_id ON public.tickets USING btree (promo_code_id);

CREATE INDEX idx_tickets_source ON public.tickets USING btree (source);

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);

CREATE INDEX idx_tickets_user_id ON public.tickets USING btree (user_id);

CREATE INDEX idx_video_rooms_event_id ON public.video_rooms USING btree (event_id);

CREATE INDEX idx_video_rooms_status ON public.video_rooms USING btree (status);

CREATE UNIQUE INDEX match_history_pkey ON public.match_history USING btree (id);

CREATE UNIQUE INDEX matchmaking_queue_event_id_user_id_key ON public.matchmaking_queue USING btree (event_id, user_id);

CREATE UNIQUE INDEX matchmaking_queue_pkey ON public.matchmaking_queue USING btree (id);

CREATE UNIQUE INDEX matchmaking_queue_user_event_unique ON public.matchmaking_queue USING btree (user_id, event_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX promo_codes_code_key ON public.promo_codes USING btree (code);

CREATE UNIQUE INDEX promo_codes_pkey ON public.promo_codes USING btree (id);

CREATE UNIQUE INDEX promo_redemptions_pkey ON public.promo_redemptions USING btree (id);

CREATE UNIQUE INDEX promo_redemptions_promo_code_id_user_id_event_id_key ON public.promo_redemptions USING btree (promo_code_id, user_id, event_id);

CREATE UNIQUE INDEX room_participants_pkey ON public.room_participants USING btree (id);

CREATE UNIQUE INDEX room_participants_room_id_user_id_key ON public.room_participants USING btree (room_id, user_id);

CREATE UNIQUE INDEX tickets_event_id_user_id_active_key ON public.tickets USING btree (event_id, user_id) WHERE (status = 'active'::text);

CREATE UNIQUE INDEX tickets_pkey ON public.tickets USING btree (id);

CREATE UNIQUE INDEX video_rooms_pkey ON public.video_rooms USING btree (id);

CREATE UNIQUE INDEX video_rooms_room_name_key ON public.video_rooms USING btree (room_name);

alter table "public"."event_updates" add constraint "event_updates_pkey" PRIMARY KEY using index "event_updates_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."match_history" add constraint "match_history_pkey" PRIMARY KEY using index "match_history_pkey";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_pkey" PRIMARY KEY using index "matchmaking_queue_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."promo_codes" add constraint "promo_codes_pkey" PRIMARY KEY using index "promo_codes_pkey";

alter table "public"."promo_redemptions" add constraint "promo_redemptions_pkey" PRIMARY KEY using index "promo_redemptions_pkey";

alter table "public"."room_participants" add constraint "room_participants_pkey" PRIMARY KEY using index "room_participants_pkey";

alter table "public"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "public"."video_rooms" add constraint "video_rooms_pkey" PRIMARY KEY using index "video_rooms_pkey";

alter table "public"."event_updates" add constraint "event_updates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."event_updates" validate constraint "event_updates_created_by_fkey";

alter table "public"."event_updates" add constraint "event_updates_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_updates" validate constraint "event_updates_event_id_fkey";

alter table "public"."events" add constraint "events_event_type_check" CHECK ((event_type = ANY (ARRAY['virtual'::text, 'in-person'::text]))) not valid;

alter table "public"."events" validate constraint "events_event_type_check";

alter table "public"."events" add constraint "events_host_id_fkey" FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_host_id_fkey";

alter table "public"."events" add constraint "events_status_check" CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."events" validate constraint "events_status_check";

alter table "public"."match_history" add constraint "match_history_check" CHECK ((user1_id < user2_id)) not valid;

alter table "public"."match_history" validate constraint "match_history_check";

alter table "public"."match_history" add constraint "match_history_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."match_history" validate constraint "match_history_event_id_fkey";

alter table "public"."match_history" add constraint "match_history_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.video_rooms(id) ON DELETE SET NULL not valid;

alter table "public"."match_history" validate constraint "match_history_room_id_fkey";

alter table "public"."match_history" add constraint "match_history_user1_id_fkey" FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."match_history" validate constraint "match_history_user1_id_fkey";

alter table "public"."match_history" add constraint "match_history_user2_id_fkey" FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."match_history" validate constraint "match_history_user2_id_fkey";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_current_room_id_fkey" FOREIGN KEY (current_room_id) REFERENCES public.video_rooms(id) ON DELETE SET NULL not valid;

alter table "public"."matchmaking_queue" validate constraint "matchmaking_queue_current_room_id_fkey";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."matchmaking_queue" validate constraint "matchmaking_queue_event_id_fkey";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_event_id_user_id_key" UNIQUE using index "matchmaking_queue_event_id_user_id_key";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_user_event_unique" UNIQUE using index "matchmaking_queue_user_event_unique";

alter table "public"."matchmaking_queue" add constraint "matchmaking_queue_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."matchmaking_queue" validate constraint "matchmaking_queue_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."promo_codes" add constraint "promo_codes_code_key" UNIQUE using index "promo_codes_code_key";

alter table "public"."promo_codes" add constraint "promo_codes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."promo_codes" validate constraint "promo_codes_created_by_fkey";

alter table "public"."promo_codes" add constraint "promo_codes_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."promo_codes" validate constraint "promo_codes_event_id_fkey";

alter table "public"."promo_codes" add constraint "promo_codes_type_check" CHECK ((type = ANY (ARRAY['percent'::text, 'fixed'::text, 'free'::text]))) not valid;

alter table "public"."promo_codes" validate constraint "promo_codes_type_check";

alter table "public"."promo_codes" add constraint "uppercase_code" CHECK ((code = upper(code))) not valid;

alter table "public"."promo_codes" validate constraint "uppercase_code";

alter table "public"."promo_codes" add constraint "valid_redemption_count" CHECK ((redeemed_count <= max_redemptions)) not valid;

alter table "public"."promo_codes" validate constraint "valid_redemption_count";

alter table "public"."promo_redemptions" add constraint "promo_redemptions_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."promo_redemptions" validate constraint "promo_redemptions_event_id_fkey";

alter table "public"."promo_redemptions" add constraint "promo_redemptions_promo_code_id_fkey" FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE not valid;

alter table "public"."promo_redemptions" validate constraint "promo_redemptions_promo_code_id_fkey";

alter table "public"."promo_redemptions" add constraint "promo_redemptions_promo_code_id_user_id_event_id_key" UNIQUE using index "promo_redemptions_promo_code_id_user_id_event_id_key";

alter table "public"."promo_redemptions" add constraint "promo_redemptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."promo_redemptions" validate constraint "promo_redemptions_user_id_fkey";

alter table "public"."room_participants" add constraint "room_participants_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.video_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."room_participants" validate constraint "room_participants_room_id_fkey";

alter table "public"."room_participants" add constraint "room_participants_room_id_user_id_key" UNIQUE using index "room_participants_room_id_user_id_key";

alter table "public"."room_participants" add constraint "room_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."room_participants" validate constraint "room_participants_user_id_fkey";

alter table "public"."tickets" add constraint "tickets_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_event_id_fkey";

alter table "public"."tickets" add constraint "tickets_payment_status_check" CHECK ((payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'refunded'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_payment_status_check";

alter table "public"."tickets" add constraint "tickets_promo_code_id_fkey" FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_promo_code_id_fkey";

alter table "public"."tickets" add constraint "tickets_source_check" CHECK ((source = ANY (ARRAY['stripe'::text, 'promo'::text, 'admin_comp'::text, 'demo'::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_source_check";

alter table "public"."tickets" add constraint "tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."tickets" validate constraint "tickets_user_id_fkey";

alter table "public"."video_rooms" add constraint "video_rooms_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."video_rooms" validate constraint "video_rooms_event_id_fkey";

alter table "public"."video_rooms" add constraint "video_rooms_room_name_key" UNIQUE using index "video_rooms_room_name_key";

alter table "public"."video_rooms" add constraint "video_rooms_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text]))) not valid;

alter table "public"."video_rooms" validate constraint "video_rooms_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.join_queue(p_event_id uuid, p_user_id uuid)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert or update queue entry (upsert)
  INSERT INTO matchmaking_queue (user_id, event_id, is_matched, current_room_id, joined_queue_at)
  VALUES (p_user_id, p_event_id, FALSE, NULL, NOW())
  ON CONFLICT (user_id, event_id)
  DO UPDATE SET
    is_matched = FALSE,
    current_room_id = NULL,
    joined_queue_at = NOW();

  RETURN QUERY SELECT TRUE, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.leave_queue(p_event_id uuid, p_user_id uuid)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM matchmaking_queue
  WHERE user_id = p_user_id
    AND event_id = p_event_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_two_users(p_event_id uuid)
 RETURNS TABLE(success boolean, room_id uuid, user1_id uuid, user2_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user1_id UUID;
  v_user2_id UUID;
  v_room_id UUID;
  v_room_name TEXT;
BEGIN
  -- Use advisory lock to prevent concurrent matching attempts for same event
  PERFORM pg_advisory_xact_lock(hashtext(p_event_id::text));

  -- Find first unmatched user
  SELECT user_id INTO STRICT v_user1_id
  FROM matchmaking_queue
  WHERE event_id = p_event_id
    AND is_matched = FALSE
  ORDER BY joined_queue_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Find second unmatched user (different from first)
  SELECT user_id INTO STRICT v_user2_id
  FROM matchmaking_queue
  WHERE event_id = p_event_id
    AND is_matched = FALSE
    AND user_id != v_user1_id
  ORDER BY joined_queue_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Generate room ID and name
  v_room_id := gen_random_uuid();
  v_room_name := v_room_id::text;

  -- Create video room
  INSERT INTO video_rooms (id, room_name, event_id, created_at)
  VALUES (v_room_id, v_room_name, p_event_id, NOW());

  -- Update both users' queue entries
  UPDATE matchmaking_queue
  SET is_matched = TRUE,
    current_room_id = v_room_id
  WHERE event_id = p_event_id
    AND user_id IN (v_user1_id, v_user2_id);

  -- Return success
  RETURN QUERY SELECT TRUE, v_room_id, v_user1_id, v_user2_id, NULL::TEXT;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    -- Not enough users to match
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::UUID, 'Not enough users in queue'::TEXT;
    RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reset_match_status(p_event_id uuid, p_user_id uuid)
 RETURNS TABLE(success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE matchmaking_queue
  SET is_matched = FALSE,
      current_room_id = NULL,
      joined_queue_at = NOW()
  WHERE user_id = p_user_id
    AND event_id = p_event_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_promo_code(p_code text, p_event_id uuid, p_user_id uuid)
 RETURNS TABLE(valid boolean, error_message text, promo_id uuid, discount_type text, discount_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_promo promo_codes;
    v_already_used BOOLEAN;
BEGIN
    -- Normalize code to uppercase
    p_code := UPPER(p_code);
    
    -- Get promo code
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE code = p_code
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (event_id IS NULL OR event_id = p_event_id)
    AND redeemed_count < max_redemptions;
    
    -- Check if promo code exists and is valid
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid, expired, or fully redeemed promo code', NULL::UUID, NULL::TEXT, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Check if user already redeemed this code for this event
    SELECT EXISTS(
        SELECT 1 FROM promo_redemptions
        WHERE promo_code_id = v_promo.id
        AND user_id = p_user_id
        AND event_id = p_event_id
    ) INTO v_already_used;
    
    IF v_already_used THEN
        RETURN QUERY SELECT false, 'You have already used this promo code for this event', NULL::UUID, NULL::TEXT, NULL::DECIMAL;
        RETURN;
    END IF;
    
    -- Valid promo code
    RETURN QUERY SELECT true, NULL::TEXT, v_promo.id, v_promo.type, v_promo.amount;
END;
$function$
;

grant delete on table "public"."event_updates" to "anon";

grant insert on table "public"."event_updates" to "anon";

grant references on table "public"."event_updates" to "anon";

grant select on table "public"."event_updates" to "anon";

grant trigger on table "public"."event_updates" to "anon";

grant truncate on table "public"."event_updates" to "anon";

grant update on table "public"."event_updates" to "anon";

grant delete on table "public"."event_updates" to "authenticated";

grant insert on table "public"."event_updates" to "authenticated";

grant references on table "public"."event_updates" to "authenticated";

grant select on table "public"."event_updates" to "authenticated";

grant trigger on table "public"."event_updates" to "authenticated";

grant truncate on table "public"."event_updates" to "authenticated";

grant update on table "public"."event_updates" to "authenticated";

grant delete on table "public"."event_updates" to "service_role";

grant insert on table "public"."event_updates" to "service_role";

grant references on table "public"."event_updates" to "service_role";

grant select on table "public"."event_updates" to "service_role";

grant trigger on table "public"."event_updates" to "service_role";

grant truncate on table "public"."event_updates" to "service_role";

grant update on table "public"."event_updates" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."match_history" to "anon";

grant insert on table "public"."match_history" to "anon";

grant references on table "public"."match_history" to "anon";

grant select on table "public"."match_history" to "anon";

grant trigger on table "public"."match_history" to "anon";

grant truncate on table "public"."match_history" to "anon";

grant update on table "public"."match_history" to "anon";

grant delete on table "public"."match_history" to "authenticated";

grant insert on table "public"."match_history" to "authenticated";

grant references on table "public"."match_history" to "authenticated";

grant select on table "public"."match_history" to "authenticated";

grant trigger on table "public"."match_history" to "authenticated";

grant truncate on table "public"."match_history" to "authenticated";

grant update on table "public"."match_history" to "authenticated";

grant delete on table "public"."match_history" to "service_role";

grant insert on table "public"."match_history" to "service_role";

grant references on table "public"."match_history" to "service_role";

grant select on table "public"."match_history" to "service_role";

grant trigger on table "public"."match_history" to "service_role";

grant truncate on table "public"."match_history" to "service_role";

grant update on table "public"."match_history" to "service_role";

grant delete on table "public"."matchmaking_queue" to "anon";

grant insert on table "public"."matchmaking_queue" to "anon";

grant references on table "public"."matchmaking_queue" to "anon";

grant select on table "public"."matchmaking_queue" to "anon";

grant trigger on table "public"."matchmaking_queue" to "anon";

grant truncate on table "public"."matchmaking_queue" to "anon";

grant update on table "public"."matchmaking_queue" to "anon";

grant delete on table "public"."matchmaking_queue" to "authenticated";

grant insert on table "public"."matchmaking_queue" to "authenticated";

grant references on table "public"."matchmaking_queue" to "authenticated";

grant select on table "public"."matchmaking_queue" to "authenticated";

grant trigger on table "public"."matchmaking_queue" to "authenticated";

grant truncate on table "public"."matchmaking_queue" to "authenticated";

grant update on table "public"."matchmaking_queue" to "authenticated";

grant delete on table "public"."matchmaking_queue" to "service_role";

grant insert on table "public"."matchmaking_queue" to "service_role";

grant references on table "public"."matchmaking_queue" to "service_role";

grant select on table "public"."matchmaking_queue" to "service_role";

grant trigger on table "public"."matchmaking_queue" to "service_role";

grant truncate on table "public"."matchmaking_queue" to "service_role";

grant update on table "public"."matchmaking_queue" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."promo_codes" to "anon";

grant insert on table "public"."promo_codes" to "anon";

grant references on table "public"."promo_codes" to "anon";

grant select on table "public"."promo_codes" to "anon";

grant trigger on table "public"."promo_codes" to "anon";

grant truncate on table "public"."promo_codes" to "anon";

grant update on table "public"."promo_codes" to "anon";

grant delete on table "public"."promo_codes" to "authenticated";

grant insert on table "public"."promo_codes" to "authenticated";

grant references on table "public"."promo_codes" to "authenticated";

grant select on table "public"."promo_codes" to "authenticated";

grant trigger on table "public"."promo_codes" to "authenticated";

grant truncate on table "public"."promo_codes" to "authenticated";

grant update on table "public"."promo_codes" to "authenticated";

grant delete on table "public"."promo_codes" to "service_role";

grant insert on table "public"."promo_codes" to "service_role";

grant references on table "public"."promo_codes" to "service_role";

grant select on table "public"."promo_codes" to "service_role";

grant trigger on table "public"."promo_codes" to "service_role";

grant truncate on table "public"."promo_codes" to "service_role";

grant update on table "public"."promo_codes" to "service_role";

grant delete on table "public"."promo_redemptions" to "anon";

grant insert on table "public"."promo_redemptions" to "anon";

grant references on table "public"."promo_redemptions" to "anon";

grant select on table "public"."promo_redemptions" to "anon";

grant trigger on table "public"."promo_redemptions" to "anon";

grant truncate on table "public"."promo_redemptions" to "anon";

grant update on table "public"."promo_redemptions" to "anon";

grant delete on table "public"."promo_redemptions" to "authenticated";

grant insert on table "public"."promo_redemptions" to "authenticated";

grant references on table "public"."promo_redemptions" to "authenticated";

grant select on table "public"."promo_redemptions" to "authenticated";

grant trigger on table "public"."promo_redemptions" to "authenticated";

grant truncate on table "public"."promo_redemptions" to "authenticated";

grant update on table "public"."promo_redemptions" to "authenticated";

grant delete on table "public"."promo_redemptions" to "service_role";

grant insert on table "public"."promo_redemptions" to "service_role";

grant references on table "public"."promo_redemptions" to "service_role";

grant select on table "public"."promo_redemptions" to "service_role";

grant trigger on table "public"."promo_redemptions" to "service_role";

grant truncate on table "public"."promo_redemptions" to "service_role";

grant update on table "public"."promo_redemptions" to "service_role";

grant delete on table "public"."room_participants" to "anon";

grant insert on table "public"."room_participants" to "anon";

grant references on table "public"."room_participants" to "anon";

grant select on table "public"."room_participants" to "anon";

grant trigger on table "public"."room_participants" to "anon";

grant truncate on table "public"."room_participants" to "anon";

grant update on table "public"."room_participants" to "anon";

grant delete on table "public"."room_participants" to "authenticated";

grant insert on table "public"."room_participants" to "authenticated";

grant references on table "public"."room_participants" to "authenticated";

grant select on table "public"."room_participants" to "authenticated";

grant trigger on table "public"."room_participants" to "authenticated";

grant truncate on table "public"."room_participants" to "authenticated";

grant update on table "public"."room_participants" to "authenticated";

grant delete on table "public"."room_participants" to "service_role";

grant insert on table "public"."room_participants" to "service_role";

grant references on table "public"."room_participants" to "service_role";

grant select on table "public"."room_participants" to "service_role";

grant trigger on table "public"."room_participants" to "service_role";

grant truncate on table "public"."room_participants" to "service_role";

grant update on table "public"."room_participants" to "service_role";

grant delete on table "public"."tickets" to "anon";

grant insert on table "public"."tickets" to "anon";

grant references on table "public"."tickets" to "anon";

grant select on table "public"."tickets" to "anon";

grant trigger on table "public"."tickets" to "anon";

grant truncate on table "public"."tickets" to "anon";

grant update on table "public"."tickets" to "anon";

grant delete on table "public"."tickets" to "authenticated";

grant insert on table "public"."tickets" to "authenticated";

grant references on table "public"."tickets" to "authenticated";

grant select on table "public"."tickets" to "authenticated";

grant trigger on table "public"."tickets" to "authenticated";

grant truncate on table "public"."tickets" to "authenticated";

grant update on table "public"."tickets" to "authenticated";

grant delete on table "public"."tickets" to "service_role";

grant insert on table "public"."tickets" to "service_role";

grant references on table "public"."tickets" to "service_role";

grant select on table "public"."tickets" to "service_role";

grant trigger on table "public"."tickets" to "service_role";

grant truncate on table "public"."tickets" to "service_role";

grant update on table "public"."tickets" to "service_role";

grant delete on table "public"."video_rooms" to "anon";

grant insert on table "public"."video_rooms" to "anon";

grant references on table "public"."video_rooms" to "anon";

grant select on table "public"."video_rooms" to "anon";

grant trigger on table "public"."video_rooms" to "anon";

grant truncate on table "public"."video_rooms" to "anon";

grant update on table "public"."video_rooms" to "anon";

grant delete on table "public"."video_rooms" to "authenticated";

grant insert on table "public"."video_rooms" to "authenticated";

grant references on table "public"."video_rooms" to "authenticated";

grant select on table "public"."video_rooms" to "authenticated";

grant trigger on table "public"."video_rooms" to "authenticated";

grant truncate on table "public"."video_rooms" to "authenticated";

grant update on table "public"."video_rooms" to "authenticated";

grant delete on table "public"."video_rooms" to "service_role";

grant insert on table "public"."video_rooms" to "service_role";

grant references on table "public"."video_rooms" to "service_role";

grant select on table "public"."video_rooms" to "service_role";

grant trigger on table "public"."video_rooms" to "service_role";

grant truncate on table "public"."video_rooms" to "service_role";

grant update on table "public"."video_rooms" to "service_role";


  create policy "Anyone can view event updates"
  on "public"."event_updates"
  as permissive
  for select
  to public
using (true);



  create policy "Anyone can view upcoming/live events"
  on "public"."events"
  as permissive
  for select
  to public
using ((status = ANY (ARRAY['upcoming'::text, 'live'::text])));



  create policy "Events are viewable by everyone"
  on "public"."events"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Events can be updated by authenticated users"
  on "public"."events"
  as permissive
  for update
  to authenticated
using (true)
with check (true);



  create policy "Hosts can create events"
  on "public"."events"
  as permissive
  for insert
  to public
with check ((auth.uid() = host_id));



  create policy "Hosts can delete own events"
  on "public"."events"
  as permissive
  for delete
  to public
using ((auth.uid() = host_id));



  create policy "Hosts can update own events"
  on "public"."events"
  as permissive
  for update
  to public
using ((auth.uid() = host_id));



  create policy "Only admins can create events"
  on "public"."events"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Only admins can delete events"
  on "public"."events"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Only admins can update events"
  on "public"."events"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "System can create match records"
  on "public"."match_history"
  as permissive
  for insert
  to public
with check (true);



  create policy "System can update match records"
  on "public"."match_history"
  as permissive
  for update
  to public
using (true);



  create policy "Users can view their own match history"
  on "public"."match_history"
  as permissive
  for select
  to public
using (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));



  create policy "Event hosts can view queue"
  on "public"."matchmaking_queue"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = matchmaking_queue.event_id) AND (events.host_id = auth.uid())))));



  create policy "Users can join queue"
  on "public"."matchmaking_queue"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can leave queue"
  on "public"."matchmaking_queue"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update own queue status"
  on "public"."matchmaking_queue"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view own queue status"
  on "public"."matchmaking_queue"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) IS NOT NULL));



  create policy "Service role full access"
  on "public"."profiles"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Admins can create promo codes"
  on "public"."promo_codes"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Admins can delete promo codes"
  on "public"."promo_codes"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Admins can update promo codes"
  on "public"."promo_codes"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Anyone can view active promo codes"
  on "public"."promo_codes"
  as permissive
  for select
  to public
using ((active = true));



  create policy "Admins can view all redemptions"
  on "public"."promo_redemptions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));



  create policy "Users can view own redemptions"
  on "public"."promo_redemptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can join rooms"
  on "public"."room_participants"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own participation"
  on "public"."room_participants"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view participants in their rooms"
  on "public"."room_participants"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.room_participants rp
  WHERE ((rp.room_id = room_participants.room_id) AND (rp.user_id = auth.uid()) AND (rp.is_active = true))))));



  create policy "Event hosts can view tickets for their events"
  on "public"."tickets"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = tickets.event_id) AND (events.host_id = auth.uid())))));



  create policy "Users can insert own tickets"
  on "public"."tickets"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can insert their own tickets"
  on "public"."tickets"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can purchase tickets"
  on "public"."tickets"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view own tickets"
  on "public"."tickets"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Event hosts can manage rooms"
  on "public"."video_rooms"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = video_rooms.event_id) AND (events.host_id = auth.uid())))));



  create policy "Matchmaking can create rooms"
  on "public"."video_rooms"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) IS NOT NULL));



  create policy "Ticket holders and admins can view rooms"
  on "public"."video_rooms"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.tickets
  WHERE ((tickets.event_id = video_rooms.event_id) AND (tickets.user_id = auth.uid()) AND (tickets.payment_status = 'completed'::text)))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));



  create policy "Users can read video rooms they're matched to"
  on "public"."video_rooms"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT matchmaking_queue.current_room_id
   FROM public.matchmaking_queue
  WHERE ((matchmaking_queue.user_id = auth.uid()) AND (matchmaking_queue.is_matched = true)))));


CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow authenticated uploads"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'event-images'::text));



  create policy "Allow public downloads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'event-images'::text));



