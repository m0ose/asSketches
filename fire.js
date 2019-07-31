import World from './node_modules/@redfish/agentscript/src/World.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import Color from './node_modules/@redfish/agentscript/src/Color.js'
import ColorMap from './node_modules/@redfish/agentscript/src/ColorMap.js'
import TwoView from './node_modules/@redfish/agentscript/src/TwoView.js'
import FireModel from './FireModel.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'
import { BoundedTileDataSetPromise } from './utils/GeoDataSet.js'
import { convertRGBFuelToOurFormat } from './firesim/anderson13Description.js'

// monkey hack
new DataSetWorkerified(
    1,
    1,
    undefined,
    './node_modules/redfish-core/dist/DataSet.worker.esm.js'
)

const FUEL_URL =
    'https://s3.amazonaws.com/simtable-fuel-tiles/and13/{z}/{x}/{y}.png'
const ELEV_URL =
    'https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/{z}/{x}/{y}.png'

const modelParams = {
    seed: null,
    maxX: 256,
    maxY: 256,
    steps: 50,
    world: null,
}
Object.assign(modelParams, util.parseQueryString())
if (modelParams.seed != null) util.randomSeed(modelParams.seed)
if (modelParams.maxY == null) modelParams.maxY = modelParams.maxX
modelParams.world = World.defaultWorld(modelParams.maxX, modelParams.maxY)

setTimeout(main)

async function main() {
    console.time('download elevation')
    const dataParams = {
        north: 37,
        south: 36.9,
        west: -105,
        east: -104.9,
        width: 257,
        height: 257,
    }
    var elev = await BoundedTileDataSetPromise(
        Object.assign({ url: ELEV_URL }, dataParams)
    )
    elev.dataset = elev.dataset.multiply(1 / 10)
    console.timeEnd('download elevation')
    console.time('download fuel')
    var fuel = await BoundedTileDataSetPromise(
        Object.assign({ url: FUEL_URL }, modelParams)
    )
    const fuel2 = convertRGBFuelToOurFormat(fuel.dataset)
    console.log('fuel2', fuel2)
    console.timeEnd('download fuel')

    const model = new FireModel(modelParams.world, elev, fuel)
    // model.population = modelParams.population;
    console.log('setup calling')
    await model.setup()
    console.log('setup done calling')
    util.toWindow({ model, modelParams, Color, ColorMap, util })

    setupDraw(model)
}

function setupDraw(model) {
    const view = new TwoView('modelDiv', modelParams.world, {
        useSprites: true,
        patchSize: modelParams.patchSize,
    })
    const drawnDS = 'dzdy' // the name of the patch property to draw
    const minElev = model.patches.map(p => p[drawnDS]).min()
    const maxElev = model.patches.map(p => p[drawnDS]).max()
    console.log({ minElev, maxElev })
    const cmap = ColorMap.Jet
    view.createPatchPixels(i => {
        const p = model.patches[i]
        const c = cmap.scaleColor(p[drawnDS], minElev, maxElev)
        return c.getPixel()
    })
    const perf = util.fps()
    util.timeoutLoop(() => {
        tick(model, perf)
        draw(view)
    }, modelParams.steps).then(() => {
        console.log(`Done, steps: ${perf.steps}, fps: ${perf.fps}`)
    })
}

function tick(model, perf) {
    model.step()
    model.tick()
    perf()
}

function draw(view) {
    view.clear()
    console.time('draw')
    view.drawPatches()
    console.timeEnd('draw')
}
