const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/role');

const router = express.Router();

// All routes require authentication + admin role
router.use(protect);
router.use(authorize(['admin']));

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lấy danh sách tất cả users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo name hoặc email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [researcher, student, lecturer, admin] }
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', userController.listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Lấy thông tin một user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 */
router.get('/:id', userController.getUser);

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Đổi role của user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [researcher, student, lecturer, admin] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/:id/role', userController.updateUserRole);

/**
 * @swagger
 * /users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Toggle active/blocked trạng thái user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status toggled
 */
router.put('/:id/status', userController.toggleUserStatus);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Xóa user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
