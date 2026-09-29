-- Seed data for admins
-- Password: admin123 (hashed with bcrypt)
INSERT INTO public.admins (username, password) VALUES 
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mr/.j4lZ6K9qJ5F9Q.wLk9Lx1M8yK0G'),
    ('manager', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mr/.j4lZ6K9qJ5F9Q.wLk9Lx1M8yK0G');

-- Seed membership plans
INSERT INTO public.membership_plans (plan_name, duration_months, amount, description) VALUES 
    ('Basic', 1, 500.00, 'Basic gym access for 1 month'),
    ('Standard', 1, 1000.00, 'Standard gym access with classes for 1 month'),
    ('Premium', 1, 2000.00, 'Premium access with personal trainer for 1 month'),
    ('Basic 3 Months', 3, 1350.00, 'Basic gym access for 3 months (10% discount)'),
    ('Standard 3 Months', 3, 2700.00, 'Standard gym access with classes for 3 months (10% discount)'),
    ('Premium 3 Months', 3, 5400.00, 'Premium access with personal trainer for 3 months (10% discount)'),
    ('Basic 6 Months', 6, 2500.00, 'Basic gym access for 6 months (17% discount)'),
    ('Standard 6 Months', 6, 5000.00, 'Standard gym access with classes for 6 months (17% discount)'),
    ('Premium 6 Months', 6, 10000.00, 'Premium access with personal trainer for 6 months (17% discount)'),
    ('Annual Basic', 12, 4500.00, 'Basic gym access for 1 year (25% discount)'),
    ('Annual Standard', 12, 9000.00, 'Standard gym access with classes for 1 year (25% discount)'),
    ('Annual Premium', 12, 18000.00, 'Premium access with personal trainer for 1 year (25% discount)');

-- Seed sample members
INSERT INTO public.members (member_code, full_name, phone, email, gender, dob, address, membership_plan, membership_start, membership_end, status)
VALUES 
    ('MF000001', 'John Doe', '+919876543210', 'john.doe@example.com', 'male', '1990-01-15', '123 Main Street, Mumbai', 'Standard', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'Active'),
    ('MF000002', 'Jane Smith', '+919876543211', 'jane.smith@example.com', 'female', '1992-05-20', '456 Park Avenue, Delhi', 'Premium', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 'Active'),
    ('MF000003', 'Bob Johnson', '+919876543212', 'bob.johnson@example.com', 'male', '1988-11-10', '789 Lake View, Bangalore', 'Basic', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 'Active'),
    ('MF000004', 'Alice Williams', '+919876543213', 'alice.williams@example.com', 'female', '1995-03-25', '321 Oak Road, Chennai', 'Standard 3 Months', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '2 months', 'Active'),
    ('MF000005', 'Charlie Brown', '+919876543214', 'charlie.brown@example.com', 'male', '1985-07-08', '654 Pine Street, Hyderabad', 'Annual Premium', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', 'Active'),
    ('MF000006', 'Emma Wilson', '+919876543215', 'emma.wilson@example.com', 'female', '1993-09-12', '987 Cedar Lane, Pune', 'Basic', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '1 month', 'Active'),
    ('MF000007', 'Michael Davis', '+919876543216', 'michael.davis@example.com', 'male', '1980-12-05', '147 Maple Drive, Kolkata', 'Standard', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Active'),
    ('MF000008', 'Sarah Miller', '+919876543217', 'sarah.miller@example.com', 'female', '1991-06-18', '258 Birch Street, Ahmedabad', 'Premium 3 Months', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '1 month', 'Active'),
    ('MF000009', 'Tom Wilson', '+919876543218', 'tom.wilson@example.com', 'male', '1987-04-30', '369 Spruce Road, Jaipur', 'Annual Basic', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', 'Active'),
    ('MF000010', 'Lisa Anderson', '+919876543219', 'lisa.anderson@example.com', 'female', '1994-08-22', '741 Elm Street, Lucknow', 'Standard 6 Months', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months', 'Active');

-- Seed payments
INSERT INTO public.payments (member_id, plan_id, amount, payment_method, transaction_id, status, receipt_number)
SELECT 
    m.id,
    (SELECT id FROM public.membership_plans WHERE plan_name = m.membership_plan LIMIT 1),
    mp.amount,
    CASE WHEN random() > 0.5 THEN 'cash' ELSE 'card' END,
    'TXN' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(floor(random() * 10000)::text, 4, '0'),
    'completed',
    'RCP' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(floor(random() * 10000)::text, 4, '0')
FROM public.members m
JOIN public.membership_plans mp ON mp.plan_name = m.membership_plan
WHERE m.id IN (SELECT id FROM public.members WHERE status = 'Active' ORDER BY random() LIMIT 5);

-- Seed some past payments
INSERT INTO public.payments (member_id, plan_id, amount, payment_date, payment_method, transaction_id, status, receipt_number)
SELECT 
    m.id,
    (SELECT id FROM public.membership_plans WHERE plan_name = m.membership_plan LIMIT 1),
    mp.amount,
    (CURRENT_DATE - INTERVAL '1 month' + (random() * INTERVAL '10 days')),
    CASE WHEN random() > 0.5 THEN 'cash' ELSE 'card' END,
    'TXN' || TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYYMMDD') || LPAD(floor(random() * 10000)::text, 4, '0'),
    'completed',
    'RCP' || TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYYMMDD') || LPAD(floor(random() * 10000)::text, 4, '0')
FROM public.members m
JOIN public.membership_plans mp ON mp.plan_name = m.membership_plan
WHERE m.id IN (SELECT id FROM public.members ORDER BY random() LIMIT 5);

-- Seed biometric sync records
INSERT INTO public.biometric_sync (member_id, action, biometric_type, synced, sync_time)
SELECT 
    m.id,
    CASE WHEN random() > 0.5 THEN 'enroll' ELSE 'verify' END,
    CASE WHEN random() > 0.5 THEN 'fingerprint' ELSE 'face' END,
    true,
    CURRENT_TIMESTAMP - (random() * INTERVAL '10 days')
FROM public.members m
WHERE m.id IN (SELECT id FROM public.members WHERE biometric_enabled = true ORDER BY random() LIMIT 5);

-- Create a function to update member status based on membership end date
CREATE OR REPLACE FUNCTION update_member_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.membership_end < CURRENT_DATE THEN
        NEW.status = 'Expired';
    ELSIF NEW.membership_end < CURRENT_DATE + INTERVAL '7 days' THEN
        -- Keep as Active but could trigger notifications
        NEW.status = 'Active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_member_status_trigger
    BEFORE INSERT OR UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION update_member_status();

-- Create a procedure to expire memberships
CREATE OR REPLACE PROCEDURE expire_memberships()
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.members
    SET status = 'Expired'
    WHERE membership_end < CURRENT_DATE
    AND status = 'Active';
    
    -- Log the expiration
    INSERT INTO public.biometric_sync (member_id, action, synced)
    SELECT id, 'expire', true
    FROM public.members
    WHERE membership_end < CURRENT_DATE
    AND status = 'Expired';
END;
$$;