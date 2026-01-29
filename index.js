import fs from 'fs';
import {DOMParser, parseHTML} from 'linkedom';

const URLs = ['https://www.national-lottery.co.uk/games/lotto'];
const metaNames = {
                    'lotto': ['lotto-must-be-won', 'lotto-next-draw-date'],
                    'euromillions': ['euromillions-next-draw-jackpot-short', 'euromillions-next-draw-date']
};
const metaNamesCallbacks = [isTrue => isTrue, figure => figure.replace('£', '').replace('M', '')];
const URLnames = ['lotto'];
let toSave = {};

const allNodes = (obj, key, array) => {
  array = array || [];
  if ('object' === typeof obj) {
    for (let k in obj) {
      if (k === key) {
        array.push(obj[k]);
      } else {
        allNodes(obj[k], key, array);
      }
    }
  }
  return array;
}

const getKeyFromName = (name) => {
    if (name.toLowerCase().indexOf('euromil') !== -1) {
        return 'euromillions';
    }
    return 'lotto';
};

const getCorrectDateFormat = (isoDate) => {
    const date = new Date(isoDate);

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = date.getUTCFullYear();

    return `${day}-${month}-${year}`;
};

const gamesWeCareAbout = ['Lotto-predefined', 'Euromillions-predefined'];
const fieldsWeCareAbout = ['jackpot', 'jackpotMustBeWon']
const resultsWeCareAbout = {};

const filterForData = (data) => {
    if (gamesWeCareAbout.includes(data['@name'])) {
        const key = getKeyFromName(data['@name']);
        const value = {
            'next-draw-jackpot-short': ((data.jackpot / 100) / 1000000).toFixed(0),
            'must-be-won': false, // for now
            'next-draw-date': getCorrectDateFormat(data.drawDate)
        };
        if (!resultsWeCareAbout[key]) resultsWeCareAbout[key] = value;
    }
};

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
        const {
          // note, these are *not* globals
          window, document, customElements,
          HTMLElement,
          Event, CustomEvent
          // other exports ..
        } = parseHTML(html);
        if (window && document) {
            console.log('got window and document');
            const nextJsData = document.querySelector("#__NEXT_DATA__");
            const data = JSON.parse(scriptNode.innerHTML)
            console.log(data);
            const results = allNodes(data, 'assignedGame');
            results.forEach((result, i) => {
                if ('object' === typeof result) {
                    if (result.hasOwnProperty('@name')) {
                       filterForData(result);
                    }
                    else {
                        result.forEach(secondaryResult => {
                           filterForData(secondaryResult);
                        });
                    }
                }
            });
        }
        else {
            console.log('no window and doc');
        }
        return resultsWeCareAbout;
    })
});

Promise.all(promises).then(results => {
    fs.writeFileSync('./lottoData.json', JSON.stringify(results[0], null, 4));
})