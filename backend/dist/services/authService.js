"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUser = sanitizeUser;
exports.signToken = signToken;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getCurrentUser = getCurrentUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = __importDefault(require("../config/env.js"));
const userRepository_js_1 = require("../repositories/userRepository.js");
function sanitizeUser(user) {
    const { password_hash, ...safeUser } = user;
    return safeUser;
}
function signToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, env_js_1.default.JWT_SECRET, { expiresIn: env_js_1.default.JWT_EXPIRES_IN });
}
async function registerUser(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await (0, userRepository_js_1.findUserByEmail)(normalizedEmail);
    if (existing) {
        throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'EMAIL_EXISTS' });
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await (0, userRepository_js_1.createUser)({
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone.trim(),
        passwordHash,
    });
    if (!user) {
        throw Object.assign(new Error('Unable to create user'), { statusCode: 500, code: 'USER_CREATE_FAILED' });
    }
    const token = signToken(user.id);
    return { token, user: sanitizeUser(user) };
}
async function loginUser(input) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await (0, userRepository_js_1.findUserByEmail)(normalizedEmail);
    if (!user) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
    }
    const passwordMatches = await bcryptjs_1.default.compare(input.password, user.password_hash);
    if (!passwordMatches) {
        throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
    }
    const token = signToken(user.id);
    return { token, user: sanitizeUser(user) };
}
async function getCurrentUser(userId) {
    const user = await (0, userRepository_js_1.findUserById)(userId);
    if (!user) {
        throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
    }
    return sanitizeUser(user);
}
