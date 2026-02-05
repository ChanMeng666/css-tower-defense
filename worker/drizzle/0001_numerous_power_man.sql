CREATE TABLE "daily_challenge_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_date" varchar(10) NOT NULL,
	"template_id" varchar(30) NOT NULL,
	"score" integer NOT NULL,
	"duration_seconds" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_challenge_completions" ADD CONSTRAINT "daily_challenge_completions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dc_date_user" ON "daily_challenge_completions" USING btree ("challenge_date","user_id");--> statement-breakpoint
CREATE INDEX "idx_dc_date_score" ON "daily_challenge_completions" USING btree ("challenge_date","score");