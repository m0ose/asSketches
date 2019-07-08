import TileDataSet from './TileDataSet.js'

onmessage = function(e) {
    if (e.data.cmd == 'init') {
        console.log('worker call init')
    } else if (e.data.cmd == 'request') {
        console.log('worker call request', e.data)
        var currId = e.data.id
        let tds = new TileDataSet(
            Object.assign(e.data, {
                callback: (err, ev2) => {
                    console.log('worker loaded 2', err, ev2)
                    if (err) {
                        postMessage({
                            cmd: 'error',
                            id: e.data.id,
                            //error: err,
                        })
                    } else {
                        postMessage({
                            cmd: 'response',
                            id: e.data.id,
                            width: ev2.width,
                            height: ev2.height,
                            data: ev2.data,
                        })
                    }
                },
            })
        )
        this.console.log('worker loaded', tds)
    } else {
        console.log('worker huh?', e)
    }
}
