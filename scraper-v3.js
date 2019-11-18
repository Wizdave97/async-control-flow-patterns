const mkdirp=require('mkdirp');
const request=require('request');
const fs=require('fs');
const path=require('path');
const utilities=require('./utilities');
const async=require('async');


const scrapeing=new Map();
const concurrency=2;
let completed=0, running=0 , index=0, errored=false
function saveFile(filename, contents, callback) {
    mkdirp(path.dirname(filename), err => {
      if(err) {
        return callback(err);
      }
      fs.writeFile(filename, contents, callback);
    });
  }
  
  function download(url, filename, callback) {
    console.log(`Downloading ${url}`);
    async.waterfall([
        function(callback){
            request(url, (err, response, body) => {
                if(err) {
                  return callback(err);
                }
                callback(null,body)
              });
        },
        function(body,callback){
            saveFile(filename, body, err => {
                if(err) {
                  return callback(err);
                }
                callback(null, body);
              });
        }
    ],function(err,body){
        if(err){
            return callback(err)
        }
        console.log(`Downloaded and saved: ${url}`);
        callback(null,body)
    })

  }
  function scrape(url, nesting, callback) {
    if(scrapeing.has(url)) return process.nextTick(callback)
    scrapeing.set(url,true);
    const filename = utilities.urlToFileName(url);
    fs.readFile(filename, 'utf8', function(err, body) {
      if(err) {
        if(err.code !== 'ENOENT') {
          return callback(err);
        }
        
        return download(url, filename, function(err, body) {
          if(err) {
            return callback(err);
          }
          scrapeLinks(url, body, nesting, callback);
        });
      }
  
      scrapeLinks(url, body, nesting, callback);
    });
  }

function scrapeLinks(currentUrl,body,nesting,callback){
    if(nesting===0) {
        return process.nextTick(callback)
    }
    let links=utilities.getPageLinks(currentUrl,body)
    //Concurrent Opertions while globally limiting concurrency
    function next(){
        while(running<concurrency && index<links.length){
            let link=links[index++]
            scrape(link,nesting-1,done)
            running++
        }
    }
    function done(err){
        if(err){
            errored=true
            return callback(err)
        }
        if(++completed>=links.length){
            return callback()
        }
        running--
        next()
    }
    next()
    debugger
    
}

scrape(process.argv[2],1,(err)=>{
    if(err) {
        console.log(err);
        process.exit(0);
      } else {
        console.log('Download complete');
      }
})