-- Drop the legacy place_bet_atomic function that took a UUID for p_round_id
-- This resolves the "Could not choose the best candidate function" RPC Error
-- because PostgREST cannot decipher whether untyped JSON string arguments 
-- should map to TEXT or UUID.

DROP FUNCTION IF EXISTS public.place_bet_atomic(TEXT, UUID, DECIMAL, BOOLEAN);
