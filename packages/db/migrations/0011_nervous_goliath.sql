ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_proposal_id_proposal_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_proposal_id_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposal"("id") ON DELETE set null ON UPDATE no action;