CREATE TABLE "chat_message_embedding" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"embedding" vector(4096) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message_embedding" ADD CONSTRAINT "chat_message_embedding_message_id_chat_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_message"("id") ON DELETE cascade ON UPDATE no action;