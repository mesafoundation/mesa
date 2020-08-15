"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersion = void 0;
const fs_1 = __importDefault(require("fs"));
function getVersion() {
    const raw = fs_1.default.readFileSync('../package.json', 'utf8');
    const json = JSON.parse(raw);
    return json.version;
}
exports.getVersion = getVersion;
