import { createClient } from '@supabase/supabase-js';

// 環境変数の読み込み
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントを1つだけ作って、アプリ全体で使い回す（これで警告が消えます）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);