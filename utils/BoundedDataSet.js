import { DataSetWorkerified } from '../node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'
import { Bounds } from './Bounds.js'
import { Point } from './Point.js'
import { TileDataSetPromise } from '../node_modules/redfish-core/lib/ModelingCore/TileDataSet.js'

class BoundedDataSet {
    constructor(dataset, bounds) {
        this.dataset = dataset
        this.bounds = bounds
    }

    getLatLon(lat, lon) {
        const xy = this.latLonToXY(lat, lon)
        const p = this.dataset.getXY(xy.x, xy.y)
        return p
    }

    setLatLon(lat, lon, val) {
        const xy = this.latLonToXY(lat, lon)
        const p = this.dataset.setXY(xy.x, xy.y, val)
        return p
    }

    latLonToXY(lat, lon) {
        const ll = this.bounds.getLowerLeft()
        const wh = this.bounds.getSize()
        const x = Math.round((lon - ll.x) * (this.dataset.width / wh.x))
        const y = Math.round((lat - ll.y) * (this.dataset.height / wh.y))
        return new Point(x, y)
    }
}

export async function BoundedTileDataSetPromise(params) {
    const v = await TileDataSetPromise(params)
    const bounds = new Bounds([
        [params.south, params.west],
        [params.north, params.east],
    ])
    return new BoundedDataSet(v, bounds)
}
