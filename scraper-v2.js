// This version of the web scraper uses generators and co

const utilities=require('./utilities')
const thunkify=require('thunkify');
const co=require('co');
const mkdirp=thunkify(require('mkdirp'));
const request=thunkify(require('request'));
const fs=require('fs');
const path=require('path');
const writeFile=thunkify(fs.writeFile);
const readFile=thunkify(fs.readFile);
const nextTick=thunkify(process.nextTick)


const scrapeing=new Map();

function* saveFile(filename, contents) {
    yield mkdirp(path.dirname(filename))
    yield writeFile(filename, contents);
  }
  
function* download(url, filename) {
    console.log(`Downloading ${url}`);
    let [res,body]=yield request(url) ;
    debugger
    yield saveFile(filename, body)
    console.log(`Downloaded and saved: ${url}`);
    return body
  }
  
  function* scrape(url, nesting) {

    if(scrapeing.has(url)) return yield nextTick()
    scrapeing.set(url,true);
    const filename = utilities.urlToFileName(url);
    let body
    try{
      body=yield readFile(filename, 'utf8')
    }
    catch(err){
      if(err.code !== 'ENOENT') {
        throw err
      }
      body=yield download(url, filename)
    }
    yield scrapeLinks(url, body, nesting);
  }

function scrapeLinks(currentUrl,body,nesting){
    if(nesting===0) {
        return nextTick()
    }
    let links=utilities.getPageLinks(currentUrl,body)
    

    //Concurrent execution pattern manually using co
    return function(callback) {
      if(links.length===0) return nextTick()
      let completed=0, errored=false
      const done=(err)=>{
          if(err){
              errored=true
              return callback(err)
          }
          if(++completed===links.length && !errored){
              return callback()
          }
      }
      links.forEach(link=>{
          co(function* (){
            yield scrape(link,nesting-1)
          }).then(done)
      })
    }
    /* Concurrent execution pattern using async library
    async.each(links,function(link,callback){
      scrape(link,nesting-1,callback)
    },callback)*/
   
    
}
co(function* (){
  yield scrape(process.argv[2],1)
}).then(()=>console.log('Download Complete'))
