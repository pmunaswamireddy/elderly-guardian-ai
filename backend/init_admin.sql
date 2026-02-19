-- Ensure the admin user exists with the default credentials
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@elderlyguardian.com', 'password', 'super_admin')
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, role = 'super_admin';

-- Verify the user was created
SELECT id, name, email, role FROM users WHERE email = 'admin@elderlyguardian.com';
