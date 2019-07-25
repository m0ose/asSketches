import World from './node_modules/@redfish/agentscript/src/World.js'
import util from './node_modules/@redfish/agentscript/src/util.js'
import Color from './node_modules/@redfish/agentscript/src/Color.js'
import ColorMap from './node_modules/@redfish/agentscript/src/ColorMap.js'
import TwoView from './node_modules/@redfish/agentscript/src/TwoView.js'
import FireModel from './FireModel.js'
import { TileDataSetPromise } from './node_modules/redfish-core/lib/ModelingCore/TileDataSet.js'
import { DataSetWorkerified } from './node_modules/redfish-core/lib/ModelingCore/DataSetWorkerified.js'

// hack
new DataSetWorkerified(
    1,
    1,
    undefined,
    './node_modules/redfish-core/dist/DataSet.worker.esm.js'
)

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
    console.time('download elevation')
    const bounds = {
        north: 37,
        south: 36.4,
        west: -105,
        east: -104.4,
        width: 513,
        height: 513,
    }
    var elev = await TileDataSetPromise(
        Object.assign(
            {
                url:
                    'https://s3-us-west-2.amazonaws.com/world-elevation-tiles/DEM_tiles/{z}/{x}/{y}.png',
            },
            bounds
        )
    )
    console.timeEnd('download elevation')
    console.time('download fuel')
    var fuel = await TileDataSetPromise(
        Object.assign(
            {
                url:
                    'https://s3.amazonaws.com/simtable-fuel-tiles/and13/{z}/{x}/{y}.png',
            },
            bounds
        )
    )
    console.timeEnd('download fuel')

    const model = new FireModel(params.world)
    // model.population = params.population;
    model.setup()

    util.toWindow({ model, params, Color, ColorMap, util })

    // Just create patches colors once:
    model.patches.ask(p => {
        let pElv = elev.getXY(
            p.x + Math.floor(elev.width / 2),
            p.y + Math.floor(elev.height / 2)
        )
        p.elevation = pElv / 10
        let pFuel = fuel.getXY(
            p.x + Math.floor(elev.width / 2),
            p.y + Math.floor(elev.height / 2)
        )
        p.fuel = pFuel
    })

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
        tick(model, view, perf)
    }, params.steps).then(() => {
        console.log(`Done, steps: ${perf.steps}, fps: ${perf.fps}`)
    })
}

function tick(model, view, perf) {
    model.step()
    model.tick()

    view.clear()
    view.drawPatches()

    perf()
}
