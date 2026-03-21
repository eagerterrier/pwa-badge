import fs from 'fs';
import puppeteer from 'puppeteer';

const URLs = ['https://www.national-lottery.co.uk/'];
const gamesWeCareAbout = ['Lotto-predefined', 'Euromillions-predefined'];
const resultsWeCareAbout = {};

const allNodes = (obj, key, array) => {
    array = array || [];
    if ('object' === typeof obj && obj !== null) {
        for (let k in obj) {
            if (k === key) {
                array.push(obj[k]);
            } else {
                allNodes(obj[k], key, array);
            }
        }
    }
    return array;
};

const getKeyFromName = (name) => {
    return name.toLowerCase().includes('euromil') ? 'euromillions' : 'lotto';
};

const getCorrectDateFormat = (isoDate) => {
    const date = new Date(isoDate);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
};

const filterForData = (data) => {
    if (gamesWeCareAbout.includes(data['@name'])) {
        const key = getKeyFromName(data['@name']);
        const value = {
            'next-draw-jackpot-short': ((data.jackpot / 100) / 1000000).toFixed(0),
            'must-be-won': data.jackpotMustBeWon || false,
            'next-draw-date': getCorrectDateFormat(data.drawDate)
        };
        if (!resultsWeCareAbout[key]) resultsWeCareAbout[key] = value;
    }
};

async function scrape() {
    // Launch the browser
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set a realistic User-Agent to avoid being blocked
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');

    for (const url of URLs) {
        try {
            console.log(`Navigating to ${url}...`);
            // 'networkidle2' waits until there are no more than 2 network connections for at least 500ms
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Extra wait to ensure hydration scripts have finished updating __NEXT_DATA__
            await new Promise(r => setTimeout(r, 2000));

            // Extract the content of the __NEXT_DATA__ script tag
            const nextDataRaw = await page.evaluate(() => {
                const element = document.querySelector("#__NEXT_DATA__");
                return element ? element.innerHTML : null;
            });

            if (nextDataRaw) {
                const data = JSON.parse(nextDataRaw);
                const results = allNodes(data, 'assignedGame');

                results.forEach((result) => {
                    if (Array.isArray(result)) {
                        result.forEach(sub => filterForData(sub));
                    } else if (typeof result === 'object') {
                        filterForData(result);
                    }
                });
            } else {
                console.error("Could not find __NEXT_DATA__ on the page.");
            }

        } catch (err) {
            console.error(`Error scraping ${url}:`, err.message);
        }
    }

    await browser.close();

    // Save the results
    fs.writeFileSync('./lottoData.json', JSON.stringify(resultsWeCareAbout, null, 4));
    console.log('Data saved to lottoData.json');
}

scrape();