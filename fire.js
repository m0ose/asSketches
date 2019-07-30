import World from './node_modules/@redfish/agentscript/src/World.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import Color from './node_modules/@redfish/agentscript/src/Color.js'
import ColorMap from './node_modules/@redfish/agentscript/src/ColorMap.js'
import TwoView from './node_modules/@redfish/agentscript/src/TwoView.js'
import FireModel from './FireModel.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'
import { Bounds } from './utils/Bounds.js'
import { BoundedTileDataSetPromise } from './utils/BoundedDataSet.js'

// monkey hack
new DataSetWorkerified(
    1,
    1,
    undefined,
    './node_modules/redfish-core/dist/DataSet.worker.esm.js'
)

const params = {
    seed: null,
    maxX: 256,
    maxY: 256,
    steps: 500,
    world: null,
}
Object.assign(params, util.parseQueryString())
if (params.seed != null) util.randomSeed(params.seed)
if (params.maxY == null) params.maxY = params.maxX
params.world = World.defaultWorld(params.maxX, params.maxY)

setTimeout(main)

async function main() {
    console.time('download elevation')
    const dataParams = {
        north: 37,
        south: 36.4,
        west: -105,
        east: -104.4,
        width: params.maxX * 2 + 1,
        height: params.maxX * 2 + 1,
    }
    var elev = await BoundedTileDataSetPromise(
        Object.assign(
            {
                url:
                    'https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/{z}/{x}/{y}.png',
            },
            dataParams
        )
    )
    elev.dataset = elev.dataset.multiply(1 / 10)
    console.timeEnd('download elevation')
    console.time('download fuel')
    var fuel = await BoundedTileDataSetPromise(
        Object.assign(
            {
                url:
                    'https://s3.amazonaws.com/simtable-fuel-tiles/and13/{z}/{x}/{y}.png',
            },
            params
        )
    )
    console.timeEnd('download fuel')

    const model = new FireModel(params.world, elev, fuel)
    // model.population = params.population;
    console.log('setup calling')
    await model.setup()
    console.log('setup done calling')
    util.toWindow({ model, params, Color, ColorMap, util })

    setupDraw(model)
}

function setupDraw(model) {
    const view = new TwoView('modelDiv', params.world, {
        useSprites: true,
        patchSize: params.patchSize,
    })
    const minElev = model.patches.map(p => p.elevation).min()
    const maxElev = model.patches.map(p => p.elevation).max()
    console.log({ minElev, maxElev })
    const cmap = ColorMap.Jet
    view.createPatchPixels(i => {
        const p = model.patches[i]
        const c = cmap.scaleColor(p.elevation, minElev, maxElev)
        return c.getPixel()
    })
    const perf = util.fps()
    util.timeoutLoop(() => {
        tick(model, perf)
        draw(view)
    }, params.steps).then(() => {
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
    view.drawPatches()
}
