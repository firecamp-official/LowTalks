import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://erhfzeejhbxccfmkozxv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGZ6ZWVqaGJ4Y2NmbWtvenh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTQxNTksImV4cCI6MjA3NzIzMDE1OX0.cwJ64wqkaK8ZqJMavYYUABMVzujS3gMibJf-MeBD6pA"
);
