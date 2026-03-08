# Инструкция по настройке Telegram Бота

Чтобы запустить свою игру в Telegram, тебе нужно создать и настроить бота через официального папу всех ботов — **@BotFather**.

### 1. Создание бота
1. Найди в Telegram пользователя [@BotFather](https://t.me/BotFather).
2. Отправь команду `/newbot`.
3. Следуй инструкциям: выбери имя для бота (напр., `Astro Crash Game`) и уникальный юзернейм (напр., `AstroCrash_bot`).
4. Скопируй **API Token** — он пригодится для бэкенда.

### 2. Настройка Mini App
1. В @BotFather отправь команду `/mybots` и выбери своего бота.
2. Перейди в **Bot Settings** -> **Menu Button** -> **Configure Menu Button**.
3. Отправь ссылку на своё приложение (напр., `https://telegram-gambling-app.vercel.app`).
4. Введи текст кнопки: `Play Astro Crash 🚀`.

### 3. Настройки для разработки
1. Если ты используешь локальный туннель (напр., Local Tunnel или ngrok), убедись, что ссылка в @BotFather совпадает с текущим URL туннеля.
2. В @BotFather включи **Inline Mode**: `Bot Settings` -> `Inline Mode` -> `Turn on`.

### 4. Обновление манифеста
Не забудь обновить файл `public/tonconnect-manifest.json`, указав в поле `url` ту же ссылку, которую ты дал @BotFather.
