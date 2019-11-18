const utilities=require('./utilities')
const mkdirp=require('mkdirp');
const request=require('request');
const fs=require('fs');
const path=require('path');
const async=require('async')


const scrapeing=new Map();
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
 
    //Sequential Execution pattern using async library
    /*async.eachSeries(links,function(link,callback){
        scrape(link,nesting-1,callback)  
    },callback)*/
    //Sequential Execution pattern manual
    const iterate=(index)=>{
        if(links.length===index) return callback(false)
        scrape(links[index],nesting-1,(err)=>{
            if(err) {
                return callback(err) 
            }
            iterate(index+1)  
        })   
    }
    iterate(0)
    
}

scrape(process.argv[2],1,(err)=>{
    if(err) {
        console.log(err);
        process.exit(0);
      } else {
        console.log('Download complete');
      }
})