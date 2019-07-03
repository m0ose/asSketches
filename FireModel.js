import Model from "./node_modules/@redfish/agentscript/src/Model.js";
import util from "./node_modules/@redfish/agentscript/src/util.js";

export default class FireModel extends Model {
  static defaults() {
    return {
      population: 10,
      speed: 0.1,
      wiggle: 0.1
    };
  }

  // ======================

  constructor(worldDptions) {
    super(worldDptions);
    // Either of these work, ctor call doesn't need to know class name
    // Object.assign(this, this.constructor.defaults())
    Object.assign(this, FireModel.defaults());
  }
  setup() {
    this.turtles.setDefault("atEdge", "bounce");
  }

  step() {}
}
