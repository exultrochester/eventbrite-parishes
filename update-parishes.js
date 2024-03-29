#!/usr/bin/env node

const fs = require('fs').promises;

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const nunjucks = require('nunjucks');

const ADD_PARISHES = [
    "St. Alban's Catholic Church",
]

const cluster_fix = /(.*?) *\(#\d+\)/;

const getParishName = ({ cluster, name, town }) => {
    if (cluster === name || !cluster) {
        return `${name} (${town})`;
    }
    return `${name} (${cluster} - ${town})`;
}

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

    let cluster = '';
    const $ = cheerio.load(text);
    const names = $('table > tbody > tr')
        .map((i, e) => {
            const cols = $('td', e).map((i, e) => $(e).text()).toArray();
            if (cols.length === 1) {
                cluster = cols[0];
                if (cluster === 'Individual') {
                    cluster = '';
                }
                const match = cluster_fix.exec(cluster);
                if (match) {
                    cluster = match[1];
                }
            }
            const [town, name] = cols;
            return { name, town, cluster };
        })
        // .map((i, o) => { console.log(o); return o })
        .filter((i, { name }) => name !== undefined)
        .map((i, { town, name, cluster }) => getParishName({ town, name, cluster }));

    return names.toArray();
};

const main = async () => {
    try {
        const parishes = await getParishes();
        parishes.sort()
        await fs.writeFile('all-parishes.json', JSON.stringify(parishes, null, 2));
        console.log(`Wrote ${parishes.length} parishes to all-parishes.json`);

        await fs.writeFile('all-parishes.txt', parishes.join('\n'));
        console.log(`Wrote ${parishes.length} parishes to all-parishes.txt`);

        console.log('Run update-eventbrite-questions.js to create the Parish cutom question on an event.')
    } catch (err) {
        console.error(err);
    }
}

if (!module.parent) {
    main();
}