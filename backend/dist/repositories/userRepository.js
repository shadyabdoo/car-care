"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.createUser = createUser;
const db_js_1 = require("../config/db.js");
async function findUserByEmail(email) {
    const [rows] = await db_js_1.pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] ?? null;
}
async function findUserById(id) {
    const [rows] = await db_js_1.pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
}
async function createUser(data) {
    const [result] = await db_js_1.pool.execute('INSERT INTO users (name, email, phone, password_hash, language, theme, accent_color) VALUES (?, ?, ?, ?, ?, ?, ?)', [data.name, data.email, data.phone, data.passwordHash, 'en', 'dark', 'blue']);
    const insertId = result.insertId;
    return findUserById(insertId);
}
