CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."passenger_type" AS ENUM('adult', 'child', 'infant_without_seat');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'awaiting_payment', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."ticketing_status" AS ENUM('not_issued', 'issued');--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"provider" text DEFAULT 'duffel' NOT NULL,
	"provider_offer_id" text NOT NULL,
	"provider_order_id" text,
	"booking_reference" text,
	"lookup_token_hash" char(64) NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"ticketing_status" "ticketing_status" DEFAULT 'not_issued' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"live_mode" boolean NOT NULL,
	"itinerary_snapshot" jsonb,
	"failure_code" text,
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "bookings_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "bookings_lookup_token_hash_unique" UNIQUE("lookup_token_hash"),
	CONSTRAINT "bookings_total_amount_non_negative" CHECK ("bookings"."total_amount" >= 0),
	CONSTRAINT "bookings_currency_format" CHECK ("bookings"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "bookings_confirmed_has_order" CHECK ("bookings"."status" NOT IN ('confirmed', 'cancelled') OR "bookings"."provider_order_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "passengers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider_passenger_id" text NOT NULL,
	"title" text,
	"given_name" text NOT NULL,
	"family_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"passenger_type" "passenger_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "passengers_booking_id_idx" ON "passengers" USING btree ("booking_id");