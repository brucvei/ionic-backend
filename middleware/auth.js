// const jwt = require('jsonwebtoken');
//   }
// module.exports = { authenticateToken, JWT_SECRET };
//
// };
//   });
//     next();
//     req.user = user;
//     }
//       return res.status(403).json({ error: 'Invalid or expired token' });
//     if (err) {
//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     return res.status(401).json({ error: 'Access token is required' });
//   if (!token) {
//
//   const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
//   const authHeader = req.headers['authorization'];
// const authenticateToken = (req, res, next) => {
//
// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
//
//
