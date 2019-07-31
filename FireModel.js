import Model from './node_modules/@redfish/agentscript/src/Model.js'
import gis from './node_modules/@redfish/agentscript/src/gis.js'

import util from './node_modules/@redfish/agentscript/src/util.js'
import { anderson13Description } from './firesim/anderson13Description.js'
import { anderson13SpreadFunctions } from './firesim/anderson13SpreadFunctions.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'
import { GeoDataSet } from './utils/GeoDataSet.js'
export default class FireModel extends Model {
    // ======================
    constructor(worldDptions, elevationDS, fuelDS) {
        super(worldDptions)
        this.elevation = elevationDS
        this.fuel = fuelDS
    }

    async setup() {
        console.log('setup called')
        this.igntionTimes = new DataSetWorkerified(
            this.world.width,
            this.world.height
        )

        this.wind = [0, 0] // dx, dy
        // make values avaliable to patches.
        //   This is faster than setting a value for the patches, and more versitile.
        this.makeGetterForPatches('elevation')
        this.makeGetterForPatches('fuel')
        this.makeGetterForPatches('ignitionTimes')
        this.computeGradInMeters(this.elevation)
    }

    burn(windDx, windDy) {
        this.patches.forEach(p => {
            p.neighbors.forEach(nei => {
                //const dx = Math.hypot(p.x - nei.x, p.y - nei.y)
                const dz = nei.elevation - p.elevation
            })
        })
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

    step() {}

    // compute gradients in meters
    computeGradInMeters(elev) {
        // get gradient
        this.dzdx = new GeoDataSet(
            elev.dataset.clone().multiply(0),
            elev.bounds
        )
        this.dzdy = new GeoDataSet(
            elev.dataset.clone().multiply(0),
            elev.bounds
        )
        this.makeGetterForPatches('dzdx')
        this.makeGetterForPatches('dzdy')
        this.patches.forEach(p => {
            let dzdx = 0
            let dzdy = 0
            if (!p.isOnEdge()) {
                const pl = this.patches.patch(p.x - 1, p.y)
                const pr = this.patches.patch(p.x + 1, p.y)
                const pu = this.patches.patch(p.x, p.y - 1)
                const pd = this.patches.patch(p.x, p.y + 1)
                const dx = this.metersBetweenPatches(pl, pr)
                const dy = this.metersBetweenPatches(pd, pu)
                dzdx = (pr.elevation - pl.elevation) / dx
                dzdy = (pu.elevation - pd.elevation) / dy
            }
            p.dzdx = dzdx
            p.dzdy = dzdy
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
                return ds.sample(x, y)
            },
            set: function(val) {
                const ds = this.model[value].dataset
                const wrd = this.model.world
                const x = Math.round(
                    ((this.x - wrd.minX) / wrd.width) * ds.width
                )
                const y = Math.round(
                    ((this.y - wrd.minY) / wrd.height) * ds.height
                )
                return ds.setXY(x, y, val)
            },
        })
    }
}
