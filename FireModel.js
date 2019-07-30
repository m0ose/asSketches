import Model from './node_modules/@redfish/agentscript/src/Model.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import { anderson13Description } from './firesim/anderson13Description.js'
import { anderson13SpreadFunctions } from './firesim/anderson13SpreadFunctions.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'

window.DataSet = DataSetWorkerified
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
        //
        //  // Just create patches colors once:
        this.patches.ask(p => {})
        this.makeGetterForPatches('elevation')
        this.makeGetterForPatches('fuel')
        this.makeGetterForPatches('dzdx')
        this.makeGetterForPatches('dzdy')
    }

    makeGetterForPatches(value) {
        Object.defineProperty(this.patches.agentProto, value, {
            get: function() {
                const x = this.x + this.model.world.maxX
                const y = this.y + this.model.world.maxY
                return this.model[value].dataset.getXY(x, y)
            },
        })
    }

    step() {}
}
