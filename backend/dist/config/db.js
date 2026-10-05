"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.testConnection = testConnection;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_js_1 = __importDefault(require("./env.js"));
exports.pool = promise_1.default.createPool({
    host: env_js_1.default.DB_HOST,
    port: env_js_1.default.DB_PORT,
    user: env_js_1.default.DB_USER,
    password: env_js_1.default.DB_PASSWORD,
    database: env_js_1.default.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
});
async function testConnection() {
    const connection = await exports.pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
}
