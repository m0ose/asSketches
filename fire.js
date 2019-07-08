import World from './node_modules/@redfish/agentscript/src/World.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import Color from './node_modules/@redfish/agentscript/src/Color.js'
import ColorMap from './node_modules/@redfish/agentscript/src/ColorMap.js'
import TwoView from './node_modules/@redfish/agentscript/src/TwoView.js'
import { TileDataSetPromise } from './utils/TileDataSet.js'
import FireModel from './FireModel.js'
import { WorkerTileDataSet } from './utils/TileDataSetWorkerInterface.js'

const params = {
    seed: null,
    // population: 100,
    maxX: 256,
    maxY: 256,
    steps: 500,
    linkColor: 'white', // css
    shape: 'dart',
    shapeSize: 2,
    patchSize: 1,
    world: null,
}
Object.assign(params, util.parseQueryString())
if (params.seed != null) util.randomSeed(params.seed)
if (params.maxY == null) params.maxY = params.maxX
params.world = World.defaultWorld(params.maxX, params.maxY)

setTimeout(main)
async function main() {
    var elev = await WorkerTileDataSet({
        north: 37,
        south: 36.8,
        west: -105,
        east: -104.6,
        url: 'http://node.redfish.com/elevation/{z}/{x}/{y}.png',
        width: 513,
        height: 513,
    })
    console.log('elev:', elev)

    const model = new FireModel(params.world)
    // model.population = params.population;
    model.setup()

    const view = new TwoView('modelDiv', params.world, {
        useSprites: true,
        patchSize: params.patchSize,
    })

    util.toWindow({ model, view, params, Color, ColorMap, util })

    // Just create patches colors once:
    model.patches.ask(p => {
        let v = elev.getXY(p.x + 256, p.y + 256)
        p.elevation = v / 10
    })
    const perf = util.fps()
    const minElev = elev.min()
    const maxElev = elev.max()
    console.log({ minElev, maxElev })
    const cmap = ColorMap.Jet
    view.createPatchPixels(i => {
        const p = model.patches[i]
        const c = cmap.scaleColor(p.elevation, minElev / 10, maxElev / 10)
        return c.getPixel()
    })

    util.timeoutLoop(() => {
        model.step()
        model.tick()

        view.clear()
        view.drawPatches()
        // view.drawPatches(model.patches, p => {
        //     const c = cmap.scaleColor(p.elevation, minElev / 10, maxElev / 10)
        //     return c.getPixel()
        // })
        perf()
    }, params.steps).then(() => {
        console.log(`Done, steps: ${perf.steps}, fps: ${perf.fps}`)
    })
}
