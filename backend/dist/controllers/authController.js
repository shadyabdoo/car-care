"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerController = registerController;
exports.loginController = loginController;
exports.meController = meController;
const authSchemas_js_1 = require("../validators/authSchemas.js");
const authService_js_1 = require("../services/authService.js");
async function registerController(req, res, next) {
    try {
        const payload = authSchemas_js_1.registerSchema.parse(req.body);
        const result = await (0, authService_js_1.registerUser)(payload);
        return res.status(201).json({ success: true, ...result });
    }
    catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
        }
        return next(error);
    }
}
async function loginController(req, res, next) {
    try {
        const payload = authSchemas_js_1.loginSchema.parse(req.body);
        const result = await (0, authService_js_1.loginUser)(payload);
        return res.json({ success: true, ...result });
    }
    catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
        }
        return next(error);
    }
}
async function meController(req, res, next) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        const user = await (0, authService_js_1.getCurrentUser)(req.user.id);
        return res.json({ success: true, user });
    }
    catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
        }
        return next(error);
    }
}
