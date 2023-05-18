const fs = require('fs');
const sax = require('sax');
const xmlbuilder = require('xmlbuilder');
let saxStream = sax.createStream(true);

interface Offer {
  [key: string]: any;
}

interface SaxNode {
  name: string;
  attributes: {
    [key: string]: string;
  };
}

let currentTag: string = '';
let currentOffer: Offer | null;
let totalNumberOfActiveOffers: number = 0;
let totalNumberOfPausedOffers: number = 0;
let root = xmlbuilder.create('offers');

function countActiveOffers(filePath: string) {
  return new Promise((resolve, reject) => {
    let saxStream = sax.createStream(true);

    interface Offer {
      [key: string]: any;
    }

    interface SaxNode {
      name: string;
      attributes: {
        [key: string]: string;
      };
    }

    let currentTag: string = '';
    let currentOffer: Offer | null;
    let totalNumberOfActiveOffers: number = 0;
    let totalNumberOfPausedOffers: number = 0;
    let root = xmlbuilder.create('offers');

    saxStream.on('opentag', function (node: SaxNode) {
      currentTag = node.name;
      if (node.name === 'offer') {
        currentOffer = {};
      }
    });

    saxStream.on('cdata', function (cdata: string) {
      if (currentOffer && currentTag === 'is_active') {
        currentOffer[currentTag] = cdata;
      }
    });

    saxStream.on('closetag', function (nodeName: string) {
      if (nodeName === 'offer') {
        if (currentOffer.is_active === 'true') {
          totalNumberOfActiveOffers++;
        } else {
          totalNumberOfPausedOffers++;
        }
        currentOffer = null;
      }
    });

    saxStream.on('end', function () {
      resolve({ totalNumberOfActiveOffers, totalNumberOfPausedOffers });
    });

    saxStream.on('error', function (error) {
      reject(error);
    });

    fs.createReadStream(filePath).pipe(saxStream);
  });
}

countActiveOffers('./feed_out.xml')
  .then((result) => {
    console.log(result);
    return result;
  })
  .catch((err) => console.log(err));
