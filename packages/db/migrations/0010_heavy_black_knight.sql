ALTER TABLE "card_embedding" DROP CONSTRAINT "card_embedding_version_id_card_version_id_fk";
--> statement-breakpoint
ALTER TABLE "card_embedding" ADD CONSTRAINT "card_embedding_version_id_card_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."card_version"("id") ON DELETE cascade ON UPDATE no action;