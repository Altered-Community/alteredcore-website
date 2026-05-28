-- Added in v1.2.0: author column on messages table
ALTER TABLE {messages}
    ADD COLUMN IF NOT EXISTS `author` VARCHAR(100) NOT NULL DEFAULT '' AFTER `text`;
