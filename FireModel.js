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
        this.elevationDS = elevationDS
        this.fuelDS = fuelDS
    }

    async setup() {
        console.log('setup called')
        this.dzdx = await this.elevationDS.dataset.dzdx()
        console.log('dzdx')
        this.dzdy = await this.elevationDS.dataset.dzdy()
        console.log('dzdy done')
        this.wind = [0, 0] // dx, dy
        //
        //  // Just create patches colors once:
        this.patches.ask(p => {
            // let pElv = this.elevationDS.getXY(
            //     p.x + this.world.maxX,
            //     p.y + this.world.maxY
            // )
            // p.elevation = pElv
            let pFuel = this.fuelDS.dataset.getXY(
                p.x + this.world.maxX,
                p.y + this.world.maxY
            )
            p.fuel = pFuel
        })
        Object.defineProperty(this.patches.agentProto, 'elevation', {
            get: function() {
                const x = this.x + this.model.world.maxX
                const y = this.y + this.model.world.maxY
                return this.model.elevationDS.dataset.getXY(x, y)
            },
        })
    }

    step() {}
}
