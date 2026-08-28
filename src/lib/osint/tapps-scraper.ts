import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * TELEGRAM APPS CENTER SCRAPER
 * This script is an initial module to extract trending and top apps from Telegram Apps Center.
 * Due to tapps.center using Next.js App Router, the data is embedded in the HTML stream (RSC payload).
 * Alternatively, we can use Puppeteer, but a lightweight static fetcher is faster.
 */

export interface TMAApp {
    id: string;
    alias: string;
    title: string;
    description: string;
    link: string; // e.g., t.me/bot_username/app
    icon_url: string;
    category?: string;
    metrics: {
        mau?: number;      // Monthly Active Users (from Telegram proxy or official API)
        likes?: number;    // From Tapps center
    }
}

export async function fetchTappsTrending(): Promise<TMAApp[]> {
    try {
        const { data } = await axios.get('https://tapps.center/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // 1. Tapps.center uses Next.js server components. The JSON state is in `self.__next_f`.
        // We will extract json-like strings using Regex to find app objects.
        // A generic app object in their state might look like:
        // {"id":"app-id-uuid","alias":"hamster_kombat","title":"Hamster Kombat"...}
        
        const extractedApps: TMAApp[] = [];
        
        // This is a naive heuristic parser for Next.js App router streams to find Apps.
        // In a production environment, we would use a GraphQL endpoint if public, or a headless browser (Puppeteer).
        const regex = /"alias":"([^"]+)","title":"([^"]+)","description":"([^"]+)"/g;
        let match;
        const seenAliases = new Set();
        
        while ((match = regex.exec(data)) !== null) {
            const alias = match[1];
            const title = match[2];
            let description = match[3];

            if (!seenAliases.has(alias) && alias.length > 2) {
                seenAliases.add(alias);
                extractedApps.push({
                    id: alias, // Using alias as ID
                    alias,
                    title,
                    description: description.substring(0, 100) + "...", // Shorten
                    link: `https://t.me/${alias}`, // Assuming standard format
                    icon_url: `https://tapps.center/images/apps/${alias}/icon`, // Placeholder URL format
                    metrics: {}
                });
            }
        }
        
        console.log(`[OSINT] Successfully parsed ${extractedApps.length} trending applications from Tapps.center`);
        return extractedApps;

    } catch (e: any) {
        console.error("[OSINT] Error fetching tapps.center data:", e.message);
        return [];
    }
}

// Development testing block
if (require.main === module) {
    (async () => {
        const apps = await fetchTappsTrending();
        console.log(apps.slice(0, 5)); // Print top 5 found
    })();
}
