const fs = require('fs');
const glob = require('glob');

const digest = {};

function main(directory) {

  toGetXMLFiles(directory)
  .then(files => {
    console.log('Found ' + files.length + ' file');

    promiseSerial(files
    .filter(file => file.indexOf('/content/') > 0 || file.indexOf('/organizations/') > 0)
    .map(file => () => toInspectFile(file)))
    .then(r => {
      console.log('Outputting final digest');
      outputDigest("digest.json");
    })


  });
}


const promiseSerial = funcs =>
  funcs.reduce((promise, func) =>
    promise.then(result =>
      func().then(Array.prototype.concat.bind(result))),
      Promise.resolve([]))

function outputDigest(file) {
  console.log(digest);
  const data = JSON.stringify(digest, 2);
  fs.writeFileSync(file, data);
}

function toGetXMLFiles(directory) {
  return new Promise(function(resolve, reject) {
    glob(directory + "/**/*.xml", {}, function (er, files) {
      resolve(files);
    })
  });
}

function toInspectFile(file) {
  return new Promise(function(resolve, reject) {
    const Parser = require('node-xml-stream');
    const fs = require('fs');
    
    const parser = new Parser();
    
    // <tag attr="hello">
    parser.on('opentag', (tag, attrs) => {
      
      if (digest[tag] === undefined) {
        console.log('adding')
        digest[tag] = { 
          tag: tag,
          count: 0,
          attrs: {}
        };
       
      }

      digest[tag].count += 1;

      Object.keys(attrs).forEach(a => {

        const v = attrs[a];

        if (digest[tag].attrs[a] === undefined) {
          digest[tag].attrs[a] = { attr: a, count: 0 };
        }
        if (digest[tag].attrs[a][v] === undefined) {
          digest[tag].attrs[a][v] = {
            value: v,
            count: 0,
          };
        }

        digest[tag].attrs[a].count += 1;
        digest[tag].attrs[a][v].count += 1;
        
      });

    });
    parser.on('finish', () => {
      resolve(digest);
    });

    parser.on('error', () => {
      console.log('error')
    });
    
    const stream = fs.createReadStream(file);
    stream.pipe(parser);
  });
}

main('/Users/darrensiegel/courses/trunk');
