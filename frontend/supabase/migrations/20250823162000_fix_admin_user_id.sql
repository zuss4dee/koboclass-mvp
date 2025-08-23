-- Fix admin user profile with correct user ID
INSERT INTO public.profiles (id, email, full_name, role, is_host, is_approved_host)
VALUES (
    '4dcea669-6957-40c9-bdfc-369b2bba904b',
    'adedamilare1@gmail.com',
    'Admin User',
    'admin',
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_host = true,
    is_approved_host = true;
