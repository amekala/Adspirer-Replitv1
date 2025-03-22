-- Skip these operations as tables already exist
-- CREATE TABLE "chat_conversations" (
--        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
--        "user_id" uuid NOT NULL,
--        "title" text NOT NULL,
--        "created_at" timestamp DEFAULT now() NOT NULL,
--        "updated_at" timestamp DEFAULT now() NOT NULL
-- );
--
-- CREATE TABLE "chat_messages" (
--        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
--        "conversation_id" uuid NOT NULL,
--        "role" text NOT NULL,
--        "content" text NOT NULL,
--        "created_at" timestamp DEFAULT now() NOT NULL
-- );
--
-- ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE no action ON UPDATE no action;

-- Creating indices instead
CREATE INDEX IF NOT EXISTS "idx_chat_conversations_user_id" ON "chat_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_conversation_id" ON "chat_messages" ("conversation_id");