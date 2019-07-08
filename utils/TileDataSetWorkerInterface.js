import DataSet from '../node_modules/@redfish/agentscript/src/DataSet.js'

const worker = new Worker('./utils/TileDataSetWorker.js', { type: 'module' })
worker.postMessage({ cmd: 'init' })

worker.onmessage = function(ev) {
    console.log(ev)
    if (ev.data.cmd == 'response') {
        const elem = pullFromQueue(ev.data.id)
        if (elem) {
            console.log('worker found it. woot')
            clearTimeout(elem.timerID)
            // convert
            let result = new DataSet(
                ev.data.width,
                ev.data.height,
                ev.data.data
            )
            console.log('worker result:', result)
            elem.resolve(result)
        } else {
            console.error(
                'Worker couldnt find this element in queue. Maybe it timed out'
            )
        }
    } else if (ev.data.cmd == 'error') {
        const elem = pullFromQueue(ev.data.id)
        if (elem) {
            clearTimeout(elem.timerID)
            elem.reject(ev.data)
        }
    }
}

var _id = 1
var queue = []

export function WorkerTileDataSet(args, timeout = 10000) {
    var prom = new Promise((resolve, reject) => {
        const id = getID()
        queue.push({ id, resolve, reject })
        let timerID = setTimeout(() => {
            const elem = pullFromQueue(id)
            if (elem) {
                elem.reject('request timed out')
            }
        }, timeout)
        worker.postMessage(Object.assign(args, { cmd: 'request', id }))
    })
    return prom
}

function pullFromQueue(id) {
    const elem = queue.filter(a => {
        return id == a.id
    })
    var newQueue = queue.filter(a => {
        return id != a.id
    })
    queue = newQueue
    if (elem.length > 0) return elem[0]
    return undefined
}

function getID() {
    return _id++
}
