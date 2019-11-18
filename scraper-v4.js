const utilities=require('./utilities');
const mkdirp=utilities.promisify(require('mkdirp'));
const request=utilities.promisify(require('request'));
const fs=require('fs');
const path=require('path');
const TaskQueue=require('./taskQueue');
const async=require('async');
const taskQueue= new TaskQueue(2);
const writeFile=utilities.promisify(fs.writeFile);
const readFile=utilities.promisify(fs.readFile);
const nextTick=utilities.promisify(process.nextTick)
const scrapeing=new Map();

function saveFile(filename, contents) {
    return mkdirp(path.dirname(filename)).then(res=>{
      return writeFile(filename, contents)
    })   
  }
  
  function download(url, filename) {
    console.log(`Downloading ${url}`);
    let contents
    return request(url).then((res,body)=>{
      contents=body
      return saveFile(filename,body)
    }).then(res=>{
      console.log(`Downloaded and saved: ${url}`);
      return Promise.resolve(contents)
    }).catch(err=>{
      return Promise.reject(err)
    })
  }
  
  function scrape(url, nesting, ) {
    if(scrapeing.has(url)) return Promise.resolve()
    scrapeing.set(url,true);
    const filename = utilities.urlToFileName(url);
    return readFile(filename, 'utf8').then(body=>{
      return scrapeLinks(url, body, nesting);
    }).catch(err=>{
      if(err) {
        if(err.code !== 'ENOENT') {
          return Promise.reject(err);
        }
        return download(url, filename).then(body=>{
          return scrapeLinks(url, body, nesting);
        }).catch(err=>{
          return Promise.reject(err)
        })
      }
    })
  }

function scrapeLinks(currentUrl,body,nesting){
    if(nesting===0) {
        return nextTick()
    }
    let links=utilities.getPageLinks(currentUrl,body)
    let completed=0
    //Running Concurrent tasks using a queue
    links.forEach(link=>{
        taskQueue.enqueue(new Promise((resolve,reject)=>{
          scrape(link,nesting-1).then(()=>{
            if(++completed==links.length){
              resolve()
           }
          }).catch(err=>{
            reject(err)
          })
        }))
    })    
}

scrape(process.argv[2],1).then(()=>{
  console.log('Download complete');
}).catch(err=>{
  console.log(err);
  process.exit(0);
})