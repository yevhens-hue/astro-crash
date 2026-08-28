import axios from 'axios';
import * as cheerio from 'cheerio';

async function fetchTapps() {
    try {
        const { data } = await axios.get('https://tapps.center/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log("Response length:", data.length);
        console.log("First 1000 chars:");
        console.log(data.substring(0, 1000));
        
        // Try to find if it's next.js
        const $ = cheerio.load(data);
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            console.log("Found __NEXT_DATA__, length:", nextData.length);
        } else {
            console.log("No __NEXT_DATA__ found. Saving to output.html for inspection.");
            require('fs').writeFileSync('output.html', data);
        }

    } catch (e) {
        console.error("Error fetching", e.message);
    }
}

fetchTapps();
