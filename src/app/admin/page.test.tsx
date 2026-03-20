// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './page';
import { useTonAddress } from '@tonconnect/ui-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

// Мокаем хуки и зависимости
vi.mock('@tonconnect/ui-react', () => ({
  useTonAddress: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Admin Dashboard', () => {
  it('должен показывать "Access Denied", если пользователь не авторизован', async () => {
    // Пользователь не подключил кошелек
    vi.mocked(useTonAddress).mockReturnValue('');

    render(<AdminDashboard />);

    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
  });

  it('должен показывать "Access Denied", если пользователь подключен, но не админ', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_user_wallet_123');
    
    // Мокаем ответ от Supabase (is_admin: false)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
    } as any);

    render(<AdminDashboard />);

    expect(await screen.findByText(/Access Denied/i)).toBeInTheDocument();
  });

  it('должен показывать дашборд, если пользователь - администратор', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_admin_wallet_456');
    
    // Мокаем ответ от Supabase (is_admin: true)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    } as any);

    render(<AdminDashboard />);

    expect(await screen.findByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать общую статистику', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_admin_wallet_456');
    
    // Структурированный мок для from()
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return queryBuilder as any;
      }
      if (table === 'slot_jackpots') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'test_jackpot', current_amount: 1000 }, error: null })
        } as any;
      }
      return {} as any;
    });

    vi.mocked(supabase.rpc).mockResolvedValueOnce({ 
      data: { total_users: 1500, total_bets: 50000, total_profit: 2500.5 }, 
      error: null 
    } as any);

    render(<AdminDashboard />);

    expect(await screen.findByText(/Total Users/i)).toBeInTheDocument();
    expect(await screen.findByText(/1[\s,.]?500/i)).toBeInTheDocument();
    
    expect(await screen.findByText(/Total Bets/i)).toBeInTheDocument();
    expect(await screen.findByText(/50[\s,.]?000/i)).toBeInTheDocument();
    
    expect(await screen.findByText(/Total Profit/i)).toBeInTheDocument();
  });

  it('должен загружать и отображать список пользователей', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_admin_wallet_456');
    
    // Структурированный мок для from()
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: '1', wallet_address: 'EQA_test_1', balance: 100, is_blocked: false },
              { id: '2', wallet_address: 'EQA_test_2', balance: 50, is_blocked: true }
            ],
            error: null
          }),
        };
        return queryBuilder as any;
      }
      if (table === 'slot_jackpots') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'test_jackpot', current_amount: 1000 }, error: null })
        } as any;
      }
      return {} as any;
    });

    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: { total_users: 2, total_bets: 0, total_profit: 0 }, 
      error: null 
    } as any);

    render(<AdminDashboard />);

    // Ждем окончания загрузки и убеждаемся, что кошельки отрендерились
    expect(await screen.findByText(/EQA_test_1/i)).toBeInTheDocument();
    expect(await screen.findByText(/100/i)).toBeInTheDocument(); // баланс
    expect(await screen.findByText(/EQA_test_2/i)).toBeInTheDocument();
  });

  it('должен блокировать пользователя при клике на кнопку', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_admin_wallet_456');
    
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: 'user_1', wallet_address: 'EQA_test_1', balance: 100, is_blocked: false }
            ],
            error: null
          }),
          update: mockUpdate
        } as any;
      }
      if (table === 'slot_jackpots') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'test_jackpot', current_amount: 1000 }, error: null })
        } as any;
      }
      return {} as any;
    });

    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: { total_users: 1, total_bets: 0, total_profit: 0 }, 
      error: null 
    } as any);

    render(<AdminDashboard />);

    const blockButton = await screen.findByRole('button', { name: /Block/i });
    fireEvent.click(blockButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_blocked: true });
    });
  });

  it('должен загружать и обновлять сумму джекпота', async () => {
    vi.mocked(useTonAddress).mockReturnValue('EQA_admin_wallet_456');
    
    const mockJackpotUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        } as any;
      }
      if (table === 'slot_jackpots') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'jackpot_1', current_amount: 5500.50 }, error: null }),
          update: mockJackpotUpdate
        } as any;
      }
      return {} as any;
    });

    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: { total_users: 1, total_bets: 0, total_profit: 0 }, 
      error: null 
    } as any);

    render(<AdminDashboard />);

    // Ждем рендера текущей суммы джекпота в инпуте
    const jackpotInput = await screen.findByDisplayValue('5500.5');
    expect(jackpotInput).toBeInTheDocument();

    // Изменяем значение и жмем "Save"
    fireEvent.change(jackpotInput, { target: { value: '6000' } });
    
    const saveButton = await screen.findByRole('button', { name: /Save Jackpot/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockJackpotUpdate).toHaveBeenCalledWith({ current_amount: 6000 });
    });
  });
});
