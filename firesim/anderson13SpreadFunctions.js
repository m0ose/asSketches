const METERS_PER_CHAIN = 20.1168

export var anderson13SpreadFunctions = {
    getSpread: function(
        fuelindex,
        slopeDegrees,
        windSpeedMilesPerHour,
        humidity
    ) {
        var slopeIndex =
            Math.round(Math.max(0, Math.min(60, slopeDegrees)) / 5) + 1
        var windSpeedMiles = windSpeedMilesPerHour
        //Negative slope, subtract factor from the wind
        if (slopeDegrees < 0) {
            windSpeedMiles = windSpeedMiles + slopeDegrees / 2
        }
        // 0 < wind < 60
        windSpeedMiles = Math.max(0, Math.min(200000, windSpeedMiles))
        var windIndex = Math.round(windSpeedMiles / 5) + 1
        windIndex = Math.max(1, Math.min(13, windIndex))
        var fuelType = this[fuelindex]
        if (!fuelType) {
            //       console.error("Error: Fuel type not found," + fuelindex)
            return 0
        } else if (fuelType.custom) {
            return this.getCustomSpread(fuelType, windSpeedMiles, slopeDegrees)
        } else if (!fuelType.matrix) {
            //towns,lakes, roads...
            return 0
        } else if (
            !fuelType.matrix[slopeIndex] ||
            !fuelType.matrix[slopeIndex][windIndex]
        ) {
            return 0
        }
        var spreadRate = fuelType.matrix[slopeIndex][windIndex]
        spreadRate = spreadRate * st.globals.metersPerChain //return in meters per hour
        return spreadRate
    },
    getCustomSpread: function(fuel, windSpeedMiles, slopeDegrees) {
        /* //from the fuel fitter
          currentFuelFunction = function(x, y) {
                var valX = (cc1[0] + cc1[1] * x + cc1[2] * x * x + cc1[3] * x * x * x)
                valX = Math.min(maxWindSpread, Math.max(0, valX))
                var valY = (cc2[0] + cc2[1] * y + cc2[2] * y * y + cc2[3] * y * y * y)
                valY = Math.min(maxSlopeSpread, Math.max(0, valY))
                var val = valX + valY //(cc1[0] + cc2[0] + cc1[1]*x + cc2[1]*y + cc1[2]*x*x + cc2[2]*y*y + cc1[3]*x*x*x + cc2[3]*y*y*y)
                val = Math.min(val, maxSpreadRate)
                return val //Math.min( 3000,Math.max(0,val))
              }
        */
        var coef_slope = fuel.custom.coefficiantsSlope
        var coef_wind = fuel.custom.coefficiantsWind
        var ws = windSpeedMiles
        var sd = slopeDegrees
        var spreadW =
            coef_wind[0] +
            coef_wind[1] * ws +
            coef_wind[2] * ws * ws +
            coef_wind[3] * ws * ws * ws
        var spreadSl =
            coef_slope[0] +
            coef_slope[1] * sd +
            coef_slope[2] * sd * sd +
            coef_slope[3] * sd * sd * sd
        var finalRate = spreadW + spreadSl
        finalRate = Math.max(1, finalRate)
        finalRate = finalRate * st.globals.metersPerChain
        return finalRate
    },

    getFuel: function(fuelIndex) {
        //
        //  this is more closely related to the canadian version
        //
        var findex = Number(fuelIndex)
        if (findex >= 400) {
            findex = Math.floor(findex / 100) * 10
        }
        if (!this[Math.floor(findex)] != undefined) {
            findex = Math.floor(findex)
        } else if (findex > 40 && findex < 99) {
            findex = Math.floor(findex / 10) * 10 //round down in this range
        }
        var fuel = this[findex]
        if (!fuel) {
            fuel = this[0]
        }
        return fuel
    },

    getHandCrewSpeed1: function(fuelIndex) {
        //  hand crew speed in meters per tick
        var fuel = this.getFuel(fuelIndex)
        if (fuelIndex == 98) {
            return 10
        } //water
        if (!fuel.handCrewSpeed1) {
            fuel = this.getFuel(0)
        }
        return fuel.handCrewSpeed1 * st.globals.metersPerChain
    },

    getHandCrewSpeed2: function(fuelIndex) {
        //  hand crew speed in meters per tick
        var fuel = this.getFuel(fuelIndex)
        if (fuelIndex == 98) {
            return 10
        } //water
        if (!fuel.handCrewSpeed2) {
            fuel = this.getFuel(0)
        }
        return fuel.handCrewSpeed2 * st.globals.metersPerChain
    },
}
