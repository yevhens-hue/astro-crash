import * as fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('output.html', 'utf-8');
const $ = cheerio.load(html);

// Find all links to apps
const apps = new Set();
$('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('/apps/')) {
        apps.add(href);
    }
    // Alternatively bots might be /bots/ or something
    if (href && href.includes('bot')) {
        apps.add(href);
    }
});

console.log("Found App Links:", Array.from(apps).slice(0, 50));

// Tapps.center provides a TRPC or internal API, maybe we can find the endpoint in the scripts.
// Let's search for "api." or "graphql" or "trpc"
const scripts = $('script').map((i, el) => $(el).html() || '').get().join('\n');
if (scripts.includes('trpc')) console.log('Uses tRPC');
if (scripts.includes('graphql')) console.log('Uses GraphQL');
if (scripts.includes('api.tapps')) console.log('Uses api.tapps');

// Also look for RSC payload which nextjs uses in app router
const rsc = scripts.includes('self.__next_f') ? 'Yes' : 'No';
console.log("RSC payload found?", rsc);
