"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
global.console = {
    ...console,
    log: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
//# sourceMappingURL=setup.js.map