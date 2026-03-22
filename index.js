import fs from 'fs';

const NAV_URL = 'https://api-dfe.national-lottery.co.uk/navigation-proxy';
const LOTTO_CMS_URL = 'https://api-dfe.national-lottery.co.uk/cms-proxy/pages/v1/games/lotto?mobileclient=false';

const getCorrectDateFormat = (isoDate) => {
    const date = new Date(isoDate);
    return `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`;
};

async function scrapeLottery() {
    try {
        // 1. Fetch general data for EuroMillions
        const navRes = await fetch(NAV_URL);
        const navData = await navRes.json();
        
        // 2. Fetch specific Lotto CMS data for the 'phase'
        const lottoRes = await fetch(LOTTO_CMS_URL);
        const lottoData = await lottoRes.json();

        const toSave = {};

        // Process EuroMillions from Nav
        const euroResult = navData.drawGamesContent?.drawGames?.results.find(r => r['@name'] === 'Euromillions-predefined');
        if (euroResult) {
            toSave['euromillions'] = {
                'next-draw-jackpot-short': (parseInt(euroResult.jackpot) / 100000000).toFixed(0),
                'next-draw-date': getCorrectDateFormat(euroResult.drawDate),
                'raw-jackpot-pounds': parseInt(euroResult.jackpot) / 100,
                'phase': euroResult.phase || 'NORMAL'
            };
        }

        // Process Lotto from CMS
        // Using the structure found in your uploaded lottomustbewon.json
        const lottoDetails = lottoData.headerArea?.["0"]?.dbgJackpotCard?.assignedGame;
        if (lottoDetails) {
            toSave['lotto'] = {
                'next-draw-jackpot-short': (parseInt(lottoDetails.jackpot) / 100000000).toFixed(0),
                'next-draw-date': getCorrectDateFormat(lottoDetails.drawDate),
                'raw-jackpot-pounds': parseInt(lottoDetails.jackpot) / 100,
                'phase': lottoDetails.phase || 'NORMAL'
            };
        }

        // 3. GitHub Actions Output for Email Notification
        const thresholdMet = (toSave.euromillions?.['raw-jackpot-pounds'] >= 100000000) || 
                           (['MUST_BE_WON', 'GUARANTEED_MILLIONAIRE', 'MUST_BE_WON_GUARANTEED_MILLIONAIRE'].includes(toSave.lotto?.phase));

        if (thresholdMet && process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `NOTIFY=true\n`);
        }

        fs.writeFileSync('./lottoData.json', JSON.stringify(toSave, null, 4));
        console.log('Update Complete');
    } catch (error) {
        console.error('Scraper Error:', error);
    }
}

scrapeLottery();