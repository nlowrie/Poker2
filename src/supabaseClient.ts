import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvmzmcptcypyojzmuanf.supabase.co'; // Replace with your Supabase project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bXptY3B0Y3lweW9qem11YW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5ODU1MzgsImV4cCI6MjA2NDU2MTUzOH0.34K_Gw5BNi1zQsk9WpH9h8Y7CIe8p3Pr9yWOSwSJYQU'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseKey);