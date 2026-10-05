"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
const env_js_1 = __importDefault(require("./config/env.js"));
const db_js_1 = require("./config/db.js");
async function startServer() {
    try {
        await (0, db_js_1.testConnection)();
        app_js_1.default.listen(env_js_1.default.PORT, () => {
            console.log(`Car Care API running on port ${env_js_1.default.PORT}`);
        });
    }
    catch (error) {
        console.error('Database connection failed. Please check MySQL and .env configuration.', error);
        process.exit(1);
    }
}
startServer();
