/**
 * Arquivo de diagnóstico para testar se o servidor está funcionando
 * Este arquivo minimal deve funcionar no Render
 */

const express = require('express');
const app = express();

// Middleware básico
app.use(express.json());

// Endpoint de teste básico
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint accessed');
  res.json({
    status: 'OK',
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/cors-test', (req, res) => {
  console.log('✅ CORS test endpoint accessed');
  res.json({
    message: 'CORS test working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  console.log('✅ Simple test endpoint accessed');
  res.json({
    message: 'Simple test working!',
    timestamp: new Date().toISOString()
  });
});

// Catch all outros endpoints
app.get('*', (req, res) => {
  console.log(`❓ Unknown route accessed: ${req.url}`);
  res.json({
    message: 'Route not found, but server is working',
    requested_route: req.url,
    available_routes: ['/health', '/cors-test', '/test'],
    timestamp: new Date().toISOString()
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Diagnostic server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔗 Test endpoints:');
  console.log('  - /health');
  console.log('  - /cors-test');
  console.log('  - /test');
});

module.exports = app;
