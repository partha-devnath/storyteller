ALTER TABLE "card_version" DROP CONSTRAINT "card_version_source_proposal_change_id_proposal_change_id_fk";
--> statement-breakpoint
ALTER TABLE "proposal_change" DROP CONSTRAINT "proposal_change_target_card_id_card_id_fk";
--> statement-breakpoint
ALTER TABLE "card_version" ADD CONSTRAINT "card_version_source_proposal_change_id_proposal_change_id_fk" FOREIGN KEY ("source_proposal_change_id") REFERENCES "public"."proposal_change"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_change" ADD CONSTRAINT "proposal_change_target_card_id_card_id_fk" FOREIGN KEY ("target_card_id") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;