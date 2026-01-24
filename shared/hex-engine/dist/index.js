"use strict";
// Shared Hex Engine - Used by both frontend and backend
// Single source of truth for hex grid logic and movement validation
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_ACTION_POINTS = exports.ACTION_COSTS = exports.HexMovementEngine = exports.HexGridSystem = void 0;
var hexGridSystem_1 = require("./hexGridSystem");
Object.defineProperty(exports, "HexGridSystem", { enumerable: true, get: function () { return hexGridSystem_1.HexGridSystem; } });
var hexMovementEngine_1 = require("./hexMovementEngine");
Object.defineProperty(exports, "HexMovementEngine", { enumerable: true, get: function () { return hexMovementEngine_1.HexMovementEngine; } });
Object.defineProperty(exports, "ACTION_COSTS", { enumerable: true, get: function () { return hexMovementEngine_1.ACTION_COSTS; } });
Object.defineProperty(exports, "BASE_ACTION_POINTS", { enumerable: true, get: function () { return hexMovementEngine_1.BASE_ACTION_POINTS; } });
