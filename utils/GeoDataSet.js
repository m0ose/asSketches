import { Bounds } from './Bounds.js'
import { Point } from './Point.js'
import { TileDataSetPromise } from '../node_modules/redfish-core/lib/ModelingCore/TileDataSet'

export class GeoDataSet {
    constructor(dataset, bounds) {
        this.dataset = dataset
        this.bounds = bounds.clone()
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
        const ll = this.bounds.min
        const wh = this.bounds.getSize()
        const x = Math.round((lon - ll.x) * (this.dataset.width / wh.x))
        const y = Math.round((lat - ll.y) * (this.dataset.height / wh.y))
        return new Point(x, y)
    }

    XYToLatLon(x, y) {
        const ll = this.bounds.min
        const wh = this.bounds.getSize()
        const lon = (x / this.dataset.width) * wh.x + ll.x
        const lat = (y / this.dataset.height) * wh.y + ll.y
        return new Point(lon, lat)
    }
}

export async function BoundedTileDataSetPromise(params) {
    const v = await TileDataSetPromise(params)
    const bounds = new Bounds([
        [params.south, params.west],
        [params.north, params.east],
    ])
    return new GeoDataSet(v, bounds)
}
