"use strict";
// Server-side exports (Node.js only)
// These adapters require Node.js modules (pg, ioredis) and cannot run in browsers
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridAdapter = exports.RedisAdapter = exports.PostgresAdapter = void 0;
var PostgresAdapter_1 = require("./adapters/PostgresAdapter");
Object.defineProperty(exports, "PostgresAdapter", { enumerable: true, get: function () { return PostgresAdapter_1.PostgresAdapter; } });
var RedisAdapter_1 = require("./adapters/RedisAdapter");
Object.defineProperty(exports, "RedisAdapter", { enumerable: true, get: function () { return RedisAdapter_1.RedisAdapter; } });
var HybridAdapter_1 = require("./adapters/HybridAdapter");
Object.defineProperty(exports, "HybridAdapter", { enumerable: true, get: function () { return HybridAdapter_1.HybridAdapter; } });
// Re-export everything from main index for convenience
__exportStar(require("./index"), exports);
