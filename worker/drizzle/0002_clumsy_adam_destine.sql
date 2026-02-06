CREATE TABLE "pending_scores" (
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
ALTER TABLE "pending_scores" ADD CONSTRAINT "pending_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ps_user" ON "pending_scores" USING btree ("user_id");