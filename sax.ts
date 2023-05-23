const fs = require('fs');
const sax = require('sax');
const xmlbuilder = require('xmlbuilder');
let saxStream = sax.createStream(true);

interface Offer {
  [key: string]: any;
}

interface OpeningFrame {
  opening: string;
  closing: string;
}

type Schedule = {
  [key: string]: OpeningFrame[];
};

interface SaxNode {
  name: string;
  attributes: {
    [key: string]: string;
  };
}

let currentTag: string = '';
let currentOffer: Offer | null;
let openingTimes: string = '';
let totalNumber: number = 0;
let numberOfActiveOffers: number = 0;
let numberOfInactiveOffers: number = 0;

let root = xmlbuilder.create('offers');
let writeStream = fs.createWriteStream('./feed_out.xml');
writeStream.write('<?xml version="1.0"?>' + '\n' + '<offers>');

saxStream.on('opentag', function (node: SaxNode) {
  currentTag = node.name;
  if (node.name === 'offer') {
    currentOffer = {};
  }
});

saxStream.on('cdata', function (cdata: string) {
  if (currentOffer && currentTag === 'opening_times') {
    currentOffer[currentTag] =  JSON.parse(cdata)
  } else if (currentOffer) {
    currentOffer[currentTag] = cdata;
  }
});

saxStream.on('closetag', function (nodeName: string) {
  if (nodeName === 'offer') {
    // totalNumber++
    // console.log(totalNumber);
    currentOffer.is_active = isOfferActive(currentOffer.opening_times);
    if (currentOffer.is_active) {
      numberOfActiveOffers++;
    } else {
      numberOfInactiveOffers++;
    }
    let root = xmlbuilder.create('offer');
    for (let prop in currentOffer) {
      root.ele(prop).dat(JSON.stringify(currentOffer[prop]));
    }

    let xmlString = root.end({ pretty: true });
    xmlString = xmlString.replace('<?xml version="1.0"?>\n', '');

    writeStream.write('\n' + xmlString  , 'utf-8', (err) => {
      if (err) {
        console.error('Error while writing : ', err);
      }
    });

    currentOffer = null;
    openingTimes = '';
  }
});

saxStream.on('end', function () {
  writeStream.write('\n' + '</offers>', 'utf-8', (err) => {
    if (err) {
      console.error('Error while writing closing tag: ', err);
    }
  });
  writeStream.end(() => {
    console.log('File created successfully.');
    console.log('Number of active offers: ', numberOfActiveOffers);
    console.log('Number of paused offers: ', numberOfInactiveOffers);
  });
});

fs.createReadStream('sample.xml').pipe(saxStream);

function isOfferActive(schedule: Schedule): boolean {
  const currentDate: Date = new Date();
  const currentUTCDay: number = currentDate.getUTCDay();

  const convertedDay: number = currentUTCDay === 0 ? 7 : currentUTCDay;
  const openingFrames: OpeningFrame[] | undefined = schedule[convertedDay];

  const currentUTCTime =
  currentDate.getUTCHours() * 60 + currentDate.getUTCMinutes(); // Przekształcenie na liczbę całkowitą
 

  if (!openingFrames || openingFrames.length === 0) {
    return false;
  }

  return openingFrames.some((frame: OpeningFrame) => {
    let { opening, closing }: OpeningFrame = frame;
    if (closing === '00:00') {
      closing = '23:59';
    }
    
    const openingTime = parseInt(opening.split(':')[0]) * 60 + parseInt(opening.split(':')[1]);
    const closingTime = parseInt(closing.split(':')[0]) * 60 + parseInt(closing.split(':')[1]);

    return currentUTCTime >= openingTime && currentUTCTime <= closingTime;
  });
}
