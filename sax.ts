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
let numberOfActiveOffers: number = 0;
let numberOfInactiveOffers: number = 0;

let totalNumber: number = 0;

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
    openingTimes += cdata;
  } else if (currentOffer) {
    currentOffer[currentTag] = cdata;
  }
});

saxStream.on('closetag', function (nodeName: string) {
  if (nodeName === 'offer') {
    totalNumber++
    console.log(totalNumber);
    currentOffer.opening_times = JSON.parse(openingTimes);
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
        console.error('Error while writing offer: ', err);
      }
    });

    currentOffer = null;
    openingTimes = '';
  }
});

saxStream.on('end', function () {
  writeStream.write('\n' + '</offers>', 'utf-8', (err) => {
    if (err) {
      console.error('Error while writing final part: ', err);
    }
  });
  writeStream.end(() => {
    console.log('XML file created successfully.');
    console.log('Number of active offers: ', numberOfActiveOffers);
    console.log('Number of inactive offers: ', numberOfInactiveOffers);
  });
});

fs.createReadStream('feed.xml').pipe(saxStream);


function isOfferActive(schedule: Schedule): boolean {
  const currentDate: Date = new Date();
  const currentUTCDay: number = currentDate.getUTCDay();
  const currentUTCTime: string =
    currentDate.getUTCHours() + ':' + currentDate.getUTCMinutes();
  const convertedDay: number = currentUTCDay === 0 ? 7 : currentUTCDay;
  const openingFrames: OpeningFrame[] | undefined = schedule[convertedDay];

  if (!openingFrames || openingFrames.length === 0) {
    return false;
  }

  return openingFrames.some((frame: OpeningFrame) => {
    let { opening, closing }: OpeningFrame = frame;
    if (closing === '00:00') {
      closing = '23:59';
    }
    return currentUTCTime >= opening && currentUTCTime <= closing;
  });
}
