const fs = require('fs');
const glob = require('glob');
const svn = require('node-svn-ultimate');
 

let digest = {};

function analyze(course) {

  const { directory } = course;
  digest = {};

  toGetXMLFiles(directory)
  .then(files => {
    console.log('Found ' + files.length + ' file');

    promiseSerial(files
    .filter(file => file.indexOf('/content/') > 0 || file.indexOf('/organizations/') > 0)
    .map(file => () => toInspectFile(file)))
    .then(r => {
      console.log('Outputting final digest');
      outputDigest(course);
    })


  });
}

function prepare(course) {
  return removeWorkingDir(course)
    .then(r => makeWorkingDir());
}

function removeWorkingDir() {
  return spawnCustom('rm -rf ./working', {});
}

function makeWorkingDir() {
  return spawnCustom('mkdir ./working', {});
}



function spawnCustom(command, options) {
  const array = command.split(' ');
  const first_command = array[0];
  array.shift();
  return new Promise((resolve, reject) => {
      const spawn = require('child_process').spawn;

      const child = spawn(first_command, array, options);
      child.stdout.on('data', function(data) {
          process.stdout.write('stdout: ' + data);
          // Here is where the output goes
      });
      child.stderr.on('data', function(data) {
          process.stdout.write('stderr: ' + data);
          // Here is where the error output goes
          reject(data);
      });
      child.on('close', function(code) {
          process.stdout.write('closing code: ' + code);
          // Here you can get the exit code of the script
          resolve();
      });
  }); 
}


function checkout(course) {

  const url = course.svn;

  return new Promise(function(resolve, reject) {
    svn.commands.checkout(url, './working', function( err ) {
      console.log( "Checkout complete" );
      resolve();
    });
  });
}


const promiseSerial = funcs =>
  funcs.reduce((promise, func) =>
    promise.then(result =>
      func().then(Array.prototype.concat.bind(result))),
      Promise.resolve([]))

function outputDigest(course) {

  const { id, name, svn } = course;
  digest.id = id;
  digest.name = name;
  digest.svn = svn;
  const data = JSON.stringify(digest, 2);
  fs.writeFileSync('./digests/' + id + '.json', data);
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
        digest[tag] = { 
          tag: tag,
          count: 0,
        };
       
      }

      digest[tag].count += 1;

      // Object.keys(attrs).forEach(a => {

      //   const v = attrs[a];

      //   if (digest[tag].attrs[a] === undefined) {
      //     digest[tag].attrs[a] = { attr: a, count: 0 };
      //   }
      //   if (digest[tag].attrs[a][v] === undefined) {
      //     digest[tag].attrs[a][v] = {
      //       value: v,
      //       count: 0,
      //     };
      //   }

      //   digest[tag].attrs[a].count += 1;
      //   digest[tag].attrs[a][v].count += 1;
        
      // });

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

main({ directory: '/Users/darrensiegel/courses/trunk', id: 'test' });
