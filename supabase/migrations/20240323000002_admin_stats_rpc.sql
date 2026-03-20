-- Create RPC to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_total_users bigint;
  v_total_bets bigint;
  v_total_profit numeric;
BEGIN
  -- 1. Check if the calling user is an admin
  SELECT is_admin INTO v_is_admin 
  FROM users 
  WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'sub';

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 2. Calculate statistics
  SELECT count(*) INTO v_total_users FROM users;
  
  SELECT count(*) INTO v_total_bets FROM crash_bets;
  
  -- Calculate profit: (total bet amount - total win amount) for finished rounds
  -- Actually, let's just do a simple sum for demonstration, maybe from platform_profit table if it exists, or just sum of all losses
  -- Taking sum(bet_amount) where win_amount = 0 (or similar)
  SELECT COALESCE(SUM(bet_amount), 0) - COALESCE(SUM(win_amount), 0)
  INTO v_total_profit
  FROM crash_bets
  WHERE status = 'cashed_out' OR status = 'crashed';

  -- 3. Return JSON
  RETURN json_build_object(
    'total_users', v_total_users,
    'total_bets', v_total_bets,
    'total_profit', v_total_profit
  );
END;
$$;
