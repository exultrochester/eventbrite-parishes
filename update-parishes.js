#!/usr/bin/env node

const fs = require('fs').promises;

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const nunjucks = require('nunjucks');

const ADD_PARISHES = [
    "St. Alban's Catholic Church",
]

nunjucks.configure('.', { autoescape: false });
const getParishes = async () => {
    const res = await fetch("https://www.dor.org/parishes-campuses-cemeteries/parish-locator-and-mass-times/", {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:79.0) Gecko/20100101 Firefox/79.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0"
        },
        "referrer": "https://www.dor.org/wp-signup.php?new=dor.org",
        "method": "GET",
        "mode": "cors"
    });

    const text = await res.text();

    const $ = cheerio.load(text);
    const names = $('table > tbody > tr').map((i, e) => {
        const cols = $('td', e).map((i, e) => $(e).text()).toArray();
        const [ town, name ] = cols;
        return `${name} (${town})`;
    });

    return names.toArray();
};

const main = async () => {
    try {
        const parishes = await getParishes();
        parishes.sort()

        const script = nunjucks.render('eventbrite-parishes.js.njk', { parishes });
        await fs.writeFile('eventbrite-parishes.js', script);
        console.log('Wrote eventbrite-parishes.js')
        console.log('Open that file in Notepad and follow the instructions.')
    } catch (err) {
        console.error(err);
    }
}

if (!module.parent) {
    main();
}