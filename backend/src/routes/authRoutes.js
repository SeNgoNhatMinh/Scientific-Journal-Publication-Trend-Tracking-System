const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký người dùng mới
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Test User" }
 *               email: { type: string, example: "test@example.com" }
 *               password: { type: string, example: "password123" }
 *               role: { type: string, enum: [researcher, student, lecturer, admin] }
 *               institution: { type: string }
 *     responses:
 *       201:
 *         description: User created (copy token from response for Authorize)
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập và lấy token JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "test@example.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Returns JWT token
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Lấy hồ sơ người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 */
router.get('/me', protect, authController.getCurrentUser);

/**
 * @swagger
 * /auth/me:
 *   put:
 *     tags: [Auth]
 *     summary: Cập nhật thông tin profile người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Nguyen Van A" }
 *               institution: { type: string, example: "FPT University" }
 *               bio: { type: string, example: "Researcher in AI" }
 *               interests: { type: string, example: "AI, Machine Learning, NLP" }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/me', protect, authController.updateProfile);

/**
 * @swagger
 * /auth/me/password:
 *   put:
 *     tags: [Auth]
 *     summary: Đổi mật khẩu người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: "oldpass123" }
 *               newPassword: { type: string, example: "newpass456" }
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password incorrect
 */
router.put('/me/password', protect, authController.updatePassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Gửi email reset mật khẩu
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: "user@example.com" }
 *     responses:
 *       200:
 *         description: Email sent (or silently skipped if not found)
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Đặt mật khẩu mới bằng token từ email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, email, newPassword]
 *             properties:
 *               token: { type: string, description: "Token từ URL email" }
 *               email: { type: string, example: "user@example.com" }
 *               newPassword: { type: string, example: "newpass456" }
 *     responses:
 *       200:
 *         description: Password reset successfully + auto login
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;