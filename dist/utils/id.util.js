"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
