const path=require('path');
const { parse, resolve}=require('url');
const cheerio=require('cheerio');
const slug=require('slug');


module.exports.urlToFileName=function (url){
    url=typeof url=='string' && url.length>0?url:false
    if(url){
        let parsedUrl=parse(url,true)
        const urlPath=parsedUrl.pathname.split('/').filter(comp=>{
            return comp!=''
        }).map(comp=>{
            return slug(comp)
        }).join('/')
        let fileName=path.join(parsedUrl.hostname,urlPath)
        if(!path.extname(fileName).match(/htm/)) fileName+='.html'
        return fileName
    }
}

module.exports.getLinkUrl=function(currentUrl,element){
    
    let link=resolve(currentUrl,element.attribs.href||"")
    
    let parsedUrl=parse(link,true)
    let currentParsedUrl=parse(currentUrl,true)
    if(currentParsedUrl.hostname!=parsedUrl.hostname || !parsedUrl.pathname || parsedUrl.pathname=='/'){
        return null
    }
    return link
}
module.exports.getPageLinks=function (currentUrl,body){
    return [].slice.call(cheerio.load(body)('a')).map(element=>{
        return module.exports.getLinkUrl(currentUrl,element)
    }).filter(link=>{
        return !!link
    })
}

module.exports.promisify=function(callBackBasedApi){
    return function promisify(){
        let args=[].slice.call(arguments);
        return new Promise((resolve,reject)=>{
            args.push((err,result)=>{
                if(err) reject(err)
                else {
                    resolve(...[].slice.call(arguments,1))
                }
            })
            callBackBasedApi.apply(null,args)
        })
    }
}

module.exports.asyncFlowWithThunks=function(generatorFunction){
    function callback(err){
        if(err){
            console.log(err)
            generator.throw(err)
        }
        let results=[].slice.call(arguments,1)
        let thunk=generator.next(...results).value
        thunk && typeof thunk == 'function' && !thunk.next && thunk(callback)
    }
    let generator
    generator=generatorFunction()
    let thunk=generator.next().value
    thunk && typeof thunk == 'function' && !thunk.next && thunk(callback)
}
module.exports.thunkify=function(callBackBasedApi){
    return function(){
        let args= [].slice.call(arguments)
        return function(callback){
            args.push(callback)
            callBackBasedApi.apply(null,args)
        }
    }    
}


