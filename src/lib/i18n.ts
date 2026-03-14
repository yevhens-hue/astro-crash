'use client';

import { useEffect, useState } from 'react';

type Locale = 'en' | 'ru';

export const translations = {
    en: {
        welcome_title: "Welcome Pilot!",
        welcome_subtitle: "Your journey begins with a gift",
        bonus_credited: "Bonus Credited",
        lets_play: "Let's Play!",
        main_balance: "Main",
        bonus_balance: "Bonus",
        wagering_left: "Left to Unlock",
        wagering_progress: "Wagering Progress",
        menu: "Menu",
        status: "Status",
        elite_explorer: "Elite Explorer",
        provably_fair: "Provably Fair",
        provably_fair_desc: "Every game round result is generated using a secure SHA-256 hash before bets are placed. This guarantees the server cannot secretly change the result after you bet.",
        balance_history: "Balance History",
        view_transactions: "View Transactions",
        aviator_strategies: "Aviator Strategies",
        best_bonuses: "Best Bonuses",
        push_notifications: "Push Notifications",
        audio_effects: "Audio Effects",
        active: "Active",
        disabled: "Disabled",
        enabled: "Enabled",
        muted: "Muted",
        deposit: "Deposit",
        withdraw: "Withdraw",
        deposit_ton: "Deposit TON",
        withdraw_ton: "Withdraw TON",
        available: "Available",
        amount_ton: "Amount (TON)",
        recipient_addr: "Recipient Address",
        min_deposit: "Minimum 0.1 TON",
        min_withdraw: "Minimum 0.5 TON",
        insufficient_balance: "Insufficient balance",
        enter_amount: "Enter a valid amount",
        enter_address: "Enter recipient address",
        processing: "Processing...",
        confirm_deposit: "Deposit Confirmed!",
        withdraw_success: "Withdrawal initiated successfully!",
        home: "Home",
        referral: "Referral",
        leaderboard: "Leaderboard",
        chat: "Chat",
        guest_mode: "Guest Testing Mode",
        big_win: "Big Win!",
        share: "Share",
        close: "Close",
        play_now: "Play Now",
        bet: "Bet",
        cash_out: "Cash Out",
        waiting_next_round: "Waiting for next round...",
        multiplier: "Multiplier",
        all_bets: "All Bets",
        my_bets: "My Bets",
        top_bets: "Top Bets",
        referral_title: "Squad Rewards",
        referral_desc: "Invite friends and earn TON from every bet they make! 3 levels of rewards.",
        copy_link: "Copy Link",
        copied: "Copied!",
        total_earned: "Total Earned",
        active_partners: "Active Partners",
        level: "Level",
        digital_balance: "Digital Balance",
        what_is_this: "What is this?",
        ton_credited_desc: "TON will be credited after blockchain confirmation",
        bonus_unlocked: "Bonus Unlocked! Your bonus funds are now real TON.",
        top_wins: "Top Wins",
        crashed: "Crashed!",
        next_launch: "Next Launch in",
        auto_bet: "Auto Bet",
        auto_cashout: "Auto Cashout",
        squad_active: "Squad 1.1x Active",
        slot_win: "🎰 BIG WIN! You won {amount} TON!",
        spin_now: "SPIN NOW",
        spinning: "SPINNING...",
        cost: "COST",
        connect_wallet_first: "Please connect your wallet first!",
        won: "WON!",
        wait: "WAIT...",
        bet_placed: "BET PLACED",
        insufficient_balance_game: "Insufficient balance!",
        guest_mode_active: "Guest Testing Mode Active",
        spin_failed: "Spin failed",
        referral_how_it_works: "How it works?",
        referral_l1_desc: "Level 1: 10% from every bet",
        referral_l2_desc: "Level 2: 3% from every bet",
        referral_l3_desc: "Level 3: 1% from every bet",
        referral_note: "Rewards are credited instantly in TON!",
    },
    ru: {
        welcome_title: "Добро пожаловать, Пилот!",
        welcome_subtitle: "Твое путешествие начинается с подарка",
        bonus_credited: "Бонус начислен",
        lets_play: "Поехали!",
        main_balance: "Основной",
        bonus_balance: "Бонусный",
        wagering_left: "Осталось отыграть",
        wagering_progress: "Прогресс отыгрыша",
        menu: "Меню",
        status: "Статус",
        elite_explorer: "Элитный Исследователь",
        provably_fair: "Честная игра",
        provably_fair_desc: "Результат каждого раунда генерируется с помощью SHA-256 хэша до начала ставок. Это гарантирует, что сервер не может изменить результат после вашей ставки.",
        balance_history: "История баланса",
        view_transactions: "Транзакции",
        aviator_strategies: "Стратегии Aviator",
        best_bonuses: "Лучшие бонусы",
        push_notifications: "Уведомления",
        audio_effects: "Звуковые эффекты",
        active: "Активно",
        disabled: "Выключено",
        enabled: "Включено",
        muted: "Выключено",
        deposit: "Депозит",
        withdraw: "Вывод",
        deposit_ton: "Пополнить TON",
        withdraw_ton: "Вывести TON",
        available: "Доступно",
        amount_ton: "Сумма (TON)",
        recipient_addr: "Адрес получателя",
        min_deposit: "Минимум 0.1 TON",
        min_withdraw: "Минимум 0.5 TON",
        insufficient_balance: "Недостаточно средств",
        enter_amount: "Введите сумму",
        enter_address: "Введите адрес",
        processing: "Обработка...",
        confirm_deposit: "Депозит подтвержден!",
        withdraw_success: "Вывод успешно инициирован!",
        home: "Главная",
        referral: "Рефералы",
        leaderboard: "Лидеры",
        chat: "Чат",
        guest_mode: "Гостевой режим",
        big_win: "Большой выигрыш!",
        share: "Поделиться",
        close: "Закрыть",
        play_now: "Играть",
        bet: "Ставка",
        cash_out: "Забрать",
        waiting_next_round: "Ожидание раунда...",
        multiplier: "Множитель",
        all_bets: "Все ставки",
        my_bets: "Мои ставки",
        top_bets: "Топ",
        referral_title: "Награды отряда",
        referral_desc: "Приглашай друзей и зарабатывай TON с каждой их ставки! 3 уровня наград.",
        copy_link: "Копировать",
        copied: "Скопировано!",
        total_earned: "Всего заработано",
        active_partners: "Активных партнеров",
        level: "Уровень",
        digital_balance: "Цифровой Баланс",
        what_is_this: "Что это?",
        ton_credited_desc: "TON будет зачислен после подтверждения в блокчейне",
        bonus_unlocked: "Бонус разблокирован! Ваши бонусные средства теперь реальные TON.",
        top_wins: "Топ выигрыши",
        crashed: "Взрыв!",
        next_launch: "Следующий запуск через",
        auto_bet: "Авто-ставка",
        auto_cashout: "Авто-вывод",
        squad_active: "Отряд 1.1x активен",
        slot_win: "🎰 BIG WIN! Вы выиграли {amount} TON!",
        spin_now: "КРУТИТЬ",
        spinning: "КРУТИМ...",
        cost: "СТОИМОСТЬ",
        connect_wallet_first: "Пожалуйста, сначала подключите кошелек!",
        won: "ВЫИГРЫШ!",
        wait: "ЖДИТЕ...",
        bet_placed: "СТАВКА ПРИНЯТА",
        insufficient_balance_game: "Недостаточно средств!",
        guest_mode_active: "Активен гостевой режим",
        spin_failed: "Ошибка спина",
        referral_how_it_works: "Как это работает?",
        referral_l1_desc: "Уровень 1: 10% с каждой ставки",
        referral_l2_desc: "Уровень 2: 3% с каждой ставки",
        referral_l3_desc: "Уровень 3: 1% с каждой ставки",
        referral_note: "Награды начисляются мгновенно в TON!",
    }
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
    currentLocale = locale;
}

export function getLocale(): Locale {
    return currentLocale;
}

export function t(key: keyof typeof translations['en']): string {
    return translations[currentLocale][key] || translations['en'][key] || key;
}

export function useI18n() {
    const [locale, setInternalLocale] = useState<Locale>(currentLocale);

    useEffect(() => {
        // Init from Telegram
        const initData = (window as any).Telegram?.WebApp?.initDataUnsafe;
        const userLang = initData?.user?.language_code;
        
        const lang = userLang?.startsWith('ru') ? 'ru' : 'en';
        setLocale(lang);
        setInternalLocale(lang);
    }, []);

    return { 
        t, 
        locale, 
        setLocale: (l: Locale) => {
            setLocale(l);
            setInternalLocale(l);
        }
    };
}
