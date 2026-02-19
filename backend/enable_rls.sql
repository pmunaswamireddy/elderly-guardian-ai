-- Enable Row Level Security on all tables to resolve Supabase security alerts

-- 1. Medicines
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

-- 2. Medicine History
ALTER TABLE medicine_history ENABLE ROW LEVEL SECURITY;

-- 3. Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 4. Vitals
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;

-- 5. Content Management
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- 6. Media Management
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- 7. Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Site Settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 9. Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 10. Channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- 11. Channel Whitelist
ALTER TABLE channel_whitelist ENABLE ROW LEVEL SECURITY;

-- 12. Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 13. Direct Messages
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- 14. DM Blocks
ALTER TABLE dm_blocks ENABLE ROW LEVEL SECURITY;

-- 15. Channel Roles
ALTER TABLE channel_roles ENABLE ROW LEVEL SECURITY;

-- 16. Users (Contains sensitive password column)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 17. Channel Bans
ALTER TABLE channel_bans ENABLE ROW LEVEL SECURITY;

-- 18. User Locations
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Note: Since the application uses a Service Role Key from the backend, 
-- all application functionality will continue to work as intended. 
-- By enabling RLS without adding explicit 'public' policies, we effectively 
-- shut down the public PostgREST API access to these tables, which is the 
-- main security recommendation.
