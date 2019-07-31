import Model from './node_modules/@redfish/agentscript/src/Model.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import { anderson13Description } from './firesim/anderson13Description.js'
import { anderson13SpreadFunctions } from './firesim/anderson13SpreadFunctions.js'

export default class FireModel extends Model {
    // ======================
    constructor(worldDptions, elevationDS, fuelDS) {
        super(worldDptions)
        this.elevation = elevationDS
        this.fuel = fuelDS
    }

    async setup() {
        console.log('setup called')
        console.time('dzdx dzdy')
        this.dzdx = await this.elevation.dataset.dzdx()
        this.dzdy = await this.elevation.dataset.dzdy()
        console.timeEnd('dzdx dzdy')
        this.wind = [0, 0] // dx, dy
        // make values avaliable to patches.
        //
        this.makeGetterForPatches('elevation')
        this.makeGetterForPatches('fuel')
        this.makeGetterForPatches('dzdx')
        this.makeGetterForPatches('dzdy')
    }

    makeGetterForPatches(value) {
        Object.defineProperty(this.patches.agentProto, value, {
            get: function() {
                const ds = this.model[value].dataset
                const wrd = this.model.world
                const x = ((this.x - wrd.minX) / wrd.width) * ds.width
                const y = ((this.y - wrd.minY) / wrd.height) * ds.height
                return ds.sample(x, y)
            },
        })
    }

    step() {}
}
