import Model from './node_modules/@redfish/agentscript/src/Model.js'
import gis from './node_modules/@redfish/agentscript/src/gis.js'

import util from './node_modules/@redfish/agentscript/src/util.js'
import { anderson13Description } from './firesim/anderson13Description.js'
import { anderson13SpreadFunctions } from './firesim/anderson13SpreadFunctions.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'
import { GeoDataSet } from './utils/GeoDataSet.js'
import TinyQueue from './node_modules/tinyqueue/index.js'

const RAD2DEG = 180 / Math.PI
const dtSeconds = 60000 //seconds
const fireCrossWindK = 1.5
export default class FireModel extends Model {
    // ======================
    constructor(worldDptions, elevationDS, fuelDS) {
        super(worldDptions)
        this.elevation = elevationDS
        this.fuel = fuelDS
        this.time = 0
    }

    async setup() {
        console.log('setup called')
        this.queue = new TinyQueue([], (a, b) => {
            return a.timeToSpread - b.timeToSpread
        })
        this.ignitionTime = new GeoDataSet(
            new DataSetWorkerified(this.world.width, this.world.height),
            this.elevation.bounds
        )
        this.wind = [10, -10] // dx, dy
        // make values avaliable to patches.
        //   This is faster than setting a value for the patches, and more versitile.
        this.makeGetterForPatches('elevation')
        this.makeGetterForPatches('fuel')
        this.makeGetterForPatches('ignitionTime')
        console.time('gradient')
        this.computeGradInMeters(this.elevation)
        console.timeEnd('gradient')
        this.patches.forEach(p => {
            p.timeToSpread = undefined
        })
        this.test()
    }

    test() {
        this.patches
            .patchRect(this.patches.patch(12, 12), 10, 10)
            .forEach(p => {
                this.ignitePatch(p, 10)
            })
    }

    step() {
        console.time('burn')
        this.burn(this.wind[0], this.wind[1])
        console.timeEnd('burn')
        this.time += dtSeconds * 1000
    }

    burn(windDx, windDy) {
        let count = 0
        let insertQueue = []
        while (
            this.queue.length > 0 &&
            this.queue.peek().timeToSpread < this.time
        ) {
            let pRef = this.queue.pop()
            // Since its hard to remove from the queue when timeToSpreadchanges, we will push another version onto in the queue, and change the patches timetospread value. Then, we can ignore them if they dont match.
            if (
                pRef.patch.ignitionTime <= 0 &&
                pRef.timeToSpread == pRef.patch.timeToSpread
            ) {
                count++
                let p = pRef.patch
                p.ignitionTime = p.timeToSpread
                p.neighbors4.forEach(nei => {
                    // check if patch has burned
                    const dist = this.metersBetweenPatches(p, nei)
                    const dElev = nei.elevation - p.elevation
                    const slope = Math.atan2(dElev, dist) * RAD2DEG
                    // wind component
                    const windComp = this.windComponent(
                        nei.x - p.x,
                        nei.y - p.y,
                        windDx,
                        windDy
                    )
                    const spreadRate = anderson13SpreadFunctions.getSpread(
                        p.fuel,
                        slope,
                        windComp,
                        0
                    )
                    const fullWind = Math.hypot(windDx, windDy)
                    // if (wind > -10.0) {
                    if (spreadRate > 5 && slope > -20 && nei.ignitionTime < 1) {
                        let queuedIgniteTime =
                            p.ignitionTime + 60 * 60 * 1000 * spreadRate
                        if (
                            nei.ignitionTime <= 0 &&
                            (nei.timeToSpread == undefined ||
                                queuedIgniteTime < nei.timeToSpread)
                        ) {
                            insertQueue.push({ nei, queuedIgniteTime })
                        }
                    }
                    // }
                })
            }
        }
        insertQueue.forEach(v => {
            this.ignitePatch(v.nei, v.queuedIgniteTime)
        })
        console.log(
            `${count} patches burned . ${
                insertQueue.length
            } newly ignited . Queue length: ${this.queue.length}`
        )
    }

    ignitePatch(patch, timeToSpread) {
        patch.timeToSpread = timeToSpread
        this.queue.push({ patch, timeToSpread })
    }

    // find the compnent of wind in a given direction
    //   project wind vector onto distance vector
    //   = magnitude of wind * (wind dot distance) /( magnitude of wind times magnitude of distance)
    windComponent(dx, dy, wx, wy) {
        var wind = Math.sqrt(wx * wx + wy * wy)
        if (wind === 0) {
            return 0
        }
        var dist = Math.sqrt(dx * dx + dy * dy)
        var windComp = (dx * wx + dy * wy) / dist
        return windComp
    }

    latitudeOf(p) {
        return this.elevation.XYToLatLon(p.x, p.y).y
    }

    longitutdeOf(p) {
        return this.elevation.XYToLatLon(p.x, p.y).x
    }

    metersBetweenPatches(p1, p2) {
        return gis.lonLat2meters(
            [this.longitutdeOf(p1), this.latitudeOf(p1)],
            [this.longitutdeOf(p2), this.latitudeOf(p2)]
        )
    }

    // compute gradients in meters
    computeGradInMeters(elev) {
        // get gradient
        this.dx = new GeoDataSet(elev.dataset.clone().multiply(0), elev.bounds)
        this.dy = new GeoDataSet(elev.dataset.clone().multiply(0), elev.bounds)
        this.slopeX = new GeoDataSet(
            elev.dataset.clone().multiply(0),
            elev.bounds
        )
        this.slopeY = new GeoDataSet(
            elev.dataset.clone().multiply(0),
            elev.bounds
        )
        this.makeGetterForPatches('dx')
        this.makeGetterForPatches('dy')
        this.makeGetterForPatches('slopeX')
        this.makeGetterForPatches('slopeY')
        const memos = []
        this.patches.forEach(p => {
            let dx = 0
            let dy = 0
            let slopeX = 0
            let slopeY = 0
            if (!p.isOnEdge()) {
                const pl = this.patches.patch(p.x - 1, p.y)
                const pr = this.patches.patch(p.x + 1, p.y)
                const pu = this.patches.patch(p.x, p.y - 1)
                const pd = this.patches.patch(p.x, p.y + 1)
                //var dx, dy
                // it was actually kind of slow, so I memoized a little piece
                // I assume that it the same for all longitudes
                // if (memos[p.y] === undefined) {
                dx = this.metersBetweenPatches(pl, pr) / 2
                dy = this.metersBetweenPatches(pd, pu) / 2
                //     memos[p.y] = [dx, dy]
                // } else {
                //     dx = memos[p.y][0]
                //     dy = memos[p.y][1]
                // }
                // dzdx = (pr.elevation - pl.elevation) / dx
                // dzdy = (pu.elevation - pd.elevation) / dy
                slopeX = Math.atan2(pr.elevation - pl.elevation, dx) * RAD2DEG
                slopeY = Math.atan2(pr.elevation - pl.elevation, dy) * RAD2DEG
            }
            p.dx = dx
            p.dy = dy
            p.slopeX = slopeX
            p.slopeY = slopeY
        })
    }

    // make a getter that samples the datase at a given patch xy.
    makeGetterForPatches(value) {
        Object.defineProperty(this.patches.agentProto, value, {
            get: function() {
                const ds = this.model[value].dataset
                const wrd = this.model.world
                const x = ((this.x - wrd.minX) / wrd.width) * ds.width
                const y = ((this.y - wrd.minY) / wrd.height) * ds.height
                //return ds.getXY(Math.floor(x), Math.floor(y))
                return ds.sample(x, y)
            },
            set: function(val) {
                const ds = this.model[value].dataset
                const wrd = this.model.world
                const x = Math.floor(
                    ((this.x - wrd.minX) / wrd.width) * ds.width
                )
                const y = Math.floor(
                    ((this.y - wrd.minY) / wrd.height) * ds.height
                )
                return ds.setXY(x, y, val)
            },
        })
    }
}
