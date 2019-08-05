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
    steps: 12000,
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
        north: 39,
        south: 38.5,
        west: -95,
        east: -94.5,
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
    fuel2.useNearest = true
    fuel.dataset = fuel2
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

    const perf = util.fps()
    util.timeoutLoop(() => {
        tick(model, perf)
        draw(view, model)
    }, modelParams.steps).then(() => {
        console.log(`Done, steps: ${perf.steps}, fps: ${perf.fps}`)
    })
}

function tick(model, perf) {
    model.step()
    model.tick()
    perf()
}

function draw(view, model) {
    view.clear()
    console.time('draw')
    var drawnDS, minElev, maxElev
    if (false) {
        drawnDS = 'elevation' // the name of the patch property to draw
        minElev = model.patches.map(p => p[drawnDS]).min()
        maxElev = model.patches.map(p => p[drawnDS]).max()
        console.log({ minElev, maxElev })
    } else {
        drawnDS = 'ignitionTime'
        minElev = 0
        maxElev = model.time + 1
    }
    const cmap = ColorMap.Jet
    view.createPatchPixels(i => {
        const p = model.patches[i]
        let val = p[drawnDS]
        const c = cmap.scaleColor(val, minElev, maxElev)
        return c.getPixel()
    })
    view.drawPatches()
    console.timeEnd('draw')
}
