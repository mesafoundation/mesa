"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
exports.generateId = generateId;
