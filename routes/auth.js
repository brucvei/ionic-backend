const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const {authenticateToken, JWT_SECRET} = require('../middleware/auth');

const router = express.Router();

router.get('/test', (req, res) => {
	console.log('✅ Simple test endpoint accessed:', req.url);
	res.json({
		message: 'Test endpoint working!',
		timestamp: new Date().toISOString(),
		method: req.method,
		url: req.url
	});
});


// Register
router.post('/register', async (req, res) => {
	try {
		console.log('🔐 Register attempt for:', req.body.email);
		const {name, email, password, image_url} = req.body;

		// Validações básicas
		if (!name || !email || !password) {
			return res.status(400).json({error: 'Name, email and password are required'});
		}

		if (password.length < 6) {
			return res.status(400).json({error: 'Password must be at least 6 characters long'});
		}

		console.log('📧 Checking if email exists:', email);

		// Verificar se o usuário já existe
		const existingUser = await userModel.findByEmail(email);
		if (existingUser) {
			console.log('❌ Email already exists:', email);
			return res.status(400).json({error: 'Email already registered'});
		}

		console.log('🔒 Hashing password...');
		// Hash da senha
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(password, saltRounds);

		console.log('👤 Creating user...');
		// Criar usuário
		const user = await userModel.create({
			name,
			email,
			password_hash,
			image_url
		});

		console.log('🎫 Generating token for user:', user.id);
		// Gerar token
		const token = jwt.sign(
				{userId: user.id, email: user.email},
				JWT_SECRET,
				{expiresIn: '24h'}
		);

		// Gerar refresh token
		const refreshToken = jwt.sign(
				{userId: user.id},
				JWT_SECRET,
				{expiresIn: '30d'}
		);

		// Salvar refresh token no banco
		await userModel.setRefreshToken(user.id, refreshToken);

		console.log('✅ User registered successfully:', user.id);
		res.status(201).json({
			message: 'User created successfully',
			token,
			refreshToken,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				image_url: user.image_url
			}
		});
	} catch (error) {
		console.error('❌ Register error:', error);

		// Diferentes tipos de erro para debug
		if (error.code === 'ENOTFOUND') {
			console.error('🔍 Database connection error - hostname not found');
			return res.status(500).json({
				error: 'Database connection failed',
				details: 'Could not resolve database hostname'
			});
		}

		if (error.code === 'ECONNREFUSED') {
			console.error('🔍 Database connection error - connection refused');
			return res.status(500).json({
				error: 'Database connection failed',
				details: 'Connection refused by database server'
			});
		}

		if (error.code === '23505') { // Unique constraint violation
			console.error('🔍 Database error - duplicate key');
			return res.status(400).json({error: 'Email already registered'});
		}

		res.status(500).json({
			error: 'Internal server error',
			details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
		});
	}
});

// Login
router.post('/login', async (req, res) => {
	try {
		const {email, password} = req.body;

		// Buscar usuário
		const user = await userModel.findByEmail(email);
		if (!user) {
			return res.status(401).json({error: 'Invalid credentials'});
		}

		// Verificar senha
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			return res.status(401).json({error: 'Invalid credentials'});
		}

		// Gerar token
		const token = jwt.sign(
				{userId: user.id, email: user.email},
				JWT_SECRET,
				{expiresIn: '24h'}
		);

		// Gerar refresh token
		const refreshToken = jwt.sign(
				{userId: user.id},
				JWT_SECRET,
				{expiresIn: '30d'}
		);

		// Salvar refresh token no banco
		await userModel.setRefreshToken(user.id, refreshToken);

		res.json({
			message: 'Login successful',
			token,
			refreshToken,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				image_url: user.image_url
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({error: 'Internal server error'});
	}
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
	try {
		const user = await userModel.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({error: 'User not found'});
		}

		res.json({user});
	} catch (error) {
		console.error('Profile error:', error);
		res.status(500).json({error: 'Internal server error'});
	}
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
	try {
		const {name, email, image_url} = req.body;

		const userData = {};
		if (name) userData.name = name;
		if (email) userData.email = email;
		if (image_url) userData.image_url = image_url;

		const updatedUser = await userModel.update(req.user.userId, userData);
		if (!updatedUser) {
			return res.status(404).json({error: 'User not found'});
		}

		res.json({
			message: 'Profile updated successfully',
			user: updatedUser
		});
	} catch (error) {
		console.error('Update profile error:', error);
		res.status(500).json({error: 'Internal server error'});
	}
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
	try {
		const {currentPassword, newPassword} = req.body;

		// Buscar usuário com senha
		const user = await userModel.findByEmail(req.user.email);
		if (!user) {
			return res.status(404).json({error: 'User not found'});
		}

		// Verificar senha atual
		const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
		if (!isValidPassword) {
			return res.status(401).json({error: 'Current password is incorrect'});
		}

		// Hash da nova senha
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(newPassword, saltRounds);

		// Atualizar senha
		await userModel.update(req.user.userId, {password_hash});

		res.json({message: 'Password changed successfully'});
	} catch (error) {
		console.error('Change password error:', error);
		res.status(500).json({error: 'Internal server error'});
	}
});

// Refresh token
router.post('/refresh', async (req, res) => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(401).json({ error: 'Refresh token is required' });
		}

		// Verificar refresh token
		const decoded = jwt.verify(refreshToken, JWT_SECRET);

		// Verificar se o refresh token existe no banco
		const user = await userModel.findByRefreshToken(refreshToken);
		if (!user || user.id !== decoded.userId) {
			return res.status(403).json({ error: 'Invalid refresh token' });
		}

		// Gerar novo access token
		const newToken = jwt.sign(
			{ userId: user.id, email: user.email },
			JWT_SECRET,
			{ expiresIn: '24h' }
		);

		res.json({
			token: newToken
		});
	} catch (error) {
		console.error('Refresh token error:', error);
		res.status(403).json({ error: 'Invalid refresh token' });
	}
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
	try {
		await userModel.clearRefreshToken(req.user.userId);
		res.json({ message: 'Logged out successfully' });
	} catch (error) {
		console.error('Logout error:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
