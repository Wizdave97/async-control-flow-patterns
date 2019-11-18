function TaskQueue(concurrency){
    this.concurrency=concurrency
    this.queue=[]
    this.running=0
}

TaskQueue.prototype.enqueue=function (task){
    this.queue.push(task)
    this.next()
}

TaskQueue.prototype.next=function () {
    const self=this
    while(self.running<self.concurrency && self.queue.length){
        let task=self.queue.shift()
        task().then(()=>{
            self.running--
            self.next()
        }).catch(err=>{
            self.running--
            self.next() 
        })
        self.running++
    }
}

module.exports=TaskQueue