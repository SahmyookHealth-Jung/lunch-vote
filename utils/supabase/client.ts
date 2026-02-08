import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL 또는 Anon Key가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL(또는 NEXT_PUBLIC_API_URL), NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해주세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
