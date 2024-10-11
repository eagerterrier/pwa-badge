const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const URLs = ['https://www.national-lottery.co.uk/games/lotto'];
const metaNames = {
                    'lotto': ['lotto-must-be-won', 'lotto-next-draw-date'],
                    'euromillions': ['euromillions-next-draw-jackpot-short', 'euromillions-next-draw-date']
};
const metaNamesCallbacks = [isTrue => isTrue, figure => figure.replace('£', '').replace('M', '')];
const URLnames = ['lotto', 'euromillions'];
let toSave = {};

let promises = URLs.map(url => {
    return fetch(url, 
        {
            method: "GET",
            mode: 'cors',
            headers: {
                'Host': 'www.national-lottery.co.uk',
                'Referer': 'https://www.national-lottery.co.uk/games/lotto'
            }
        }
    )
    .then(response => response.text())
    .then(html => {
        const dom = new JSDOM(html);
        if (dom && dom.window.document) {
            Object.keys(metaNames).forEach((lottoType, index) => {
                toSave[lottoType] = {};
                metaNames[lottoType].forEach((metaToSearch, i) => {
                    const jsonld = dom.window.document.querySelector(`meta[name="${metaToSearch}"]`);
                    if (jsonld) {
                        const metaValue = i === 0 ? metaNamesCallbacks[index](jsonld.content) : jsonld.content;
                        toSave[lottoType][metaToSearch.replace(`${lottoType}-`, '')] = metaValue;
                    }
                });
            });
        }
        return toSave;
    })
});

Promise.all(promises).then(results => {
    fs.writeFileSync('./lottoData.json', JSON.stringify(results[0], null, 4));
})