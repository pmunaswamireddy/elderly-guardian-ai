-- Fix Avatar URLs for All Users
-- This will set default avatars using UI Avatars API

-- Update all users with missing avatars
UPDATE users 
SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+') || '&background=random&color=fff&size=128&bold=true'
WHERE avatar_url IS NULL OR avatar_url = '' OR avatar_url LIKE '%undefined%';

-- Performance Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_receiver ON dm_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_composite ON dm_messages(sender_id, receiver_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel, timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_bans_user ON channel_bans(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_roles_lookup ON channel_roles(channel_id, user_id);

--Verify the fix
SELECT id, name, avatar_url FROM users LIMIT 5;
