import { createClient } from '@supabase/supabase-js';

// Fallback values for build time to prevent crashes during prerendering
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function syncTelegramUser(user: { id: number; first_name: string; username?: string }) {
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_id: user.id.toString(),
      first_name: user.first_name,
      username: user.username,
      last_seen: new Date().toISOString()
    }, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) {
    console.error('Error syncing user:', error);
    return null;
  }
  return data;
}
