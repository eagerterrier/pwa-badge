import fs from 'fs';

const URL = 'https://api-dfe.national-lottery.co.uk/navigation-proxy';
const gamesToTrack = ['Lotto-predefined', 'Euromillions-predefined'];

const getCorrectDateFormat = (isoDate) => {
    const date = new Date(isoDate);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
};

async function scrapeLottery() {
    try {
        console.log('Fetching lottery data...');
        const response = await fetch(URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Origin': 'https://www.national-lottery.co.uk',
                'Referer': 'https://www.national-lottery.co.uk/'
            }
        });

        const data = await response.json();
        const results = data.drawGamesContent?.drawGames?.results || [];
        const toSave = {};

        results.forEach(game => {
            const name = game['@name'];
            
            if (gamesToTrack.includes(name)) {
                const key = name.toLowerCase().includes('euromil') ? 'euromillions' : 'lotto';
                
                // Convert pence to pounds, then to Millions for your short-jackpot format
                const jackpotPounds = parseInt(game.jackpot) / 100;
                const jackpotMillions = (jackpotPounds / 1000000).toFixed(0);

                toSave[key] = {
                    'next-draw-jackpot-short': jackpotMillions,
                    'must-be-won': false, // Placeholder for now
                    'next-draw-date': getCorrectDateFormat(game.drawDate),
                    'raw-jackpot-pounds': jackpotPounds // Useful for your threshold check
                };
            }
        });

        fs.writeFileSync('./lottoData.json', JSON.stringify(toSave, null, 4));
        console.log('Successfully saved lottoData.json');

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

scrapeLottery();