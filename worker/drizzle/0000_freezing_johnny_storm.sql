CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" varchar(30) NOT NULL,
	"unlocked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"score" integer NOT NULL,
	"wave_reached" integer NOT NULL,
	"outcome" varchar(10) NOT NULL,
	"duration_seconds" integer,
	"towers_built" integer DEFAULT 0,
	"enemies_killed" integer DEFAULT 0,
	"played_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slot" integer NOT NULL,
	"save_name" varchar(50),
	"difficulty" varchar(10) NOT NULL,
	"gold" integer NOT NULL,
	"lives" integer NOT NULL,
	"score" integer NOT NULL,
	"current_wave" integer NOT NULL,
	"inventory" jsonb DEFAULT '{}'::jsonb,
	"towers" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" varchar(30) NOT NULL,
	"score" integer NOT NULL,
	"difficulty" varchar(10) NOT NULL,
	"wave_reached" integer NOT NULL,
	"towers_built" integer DEFAULT 0,
	"enemies_killed" integer DEFAULT 0,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" varchar(30) NOT NULL,
	"total_games_played" integer DEFAULT 0,
	"total_enemies_killed" integer DEFAULT 0,
	"total_gold_earned" integer DEFAULT 0,
	"total_play_time_seconds" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progression" (
	"user_id" text PRIMARY KEY NOT NULL,
	"xp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"skill_points" integer DEFAULT 0,
	"upgrades" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_history" ADD CONSTRAINT "game_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_saves" ADD CONSTRAINT "game_saves_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progression" ADD CONSTRAINT "progression_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ach_uniq" ON "achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX "idx_gh_user" ON "game_history" USING btree ("user_id","played_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_save_slot" ON "game_saves" USING btree ("user_id","slot");--> statement-breakpoint
CREATE INDEX "idx_lb_score" ON "leaderboard_entries" USING btree ("difficulty","score");--> statement-breakpoint
CREATE INDEX "idx_lb_user" ON "leaderboard_entries" USING btree ("user_id");