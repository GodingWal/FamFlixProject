import { Router } from 'express';
import { checkCacheHealth, cacheGet, cacheSet, cacheDeletePattern } from '../encryption';
import { requireRole } from '../auth';
import { log } from '../logger';

const router = Router();

// Health check endpoint for encryption system
router.get('/health', async (req, res) => {
  try {
    const health = await checkCacheHealth();
    res.json({
      encryption: {
        status: 'active',
        algorithm: 'aes-256-gcm'
      },
      redis: {
        connected: health.redis,
        latency: health.latency || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log(`Encryption health check error: ${(error as Error).message}`, 'error');
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Admin endpoint to clear cache patterns
router.delete('/cache/:pattern', requireRole(['admin']), async (req, res) => {
  try {
    const { pattern } = req.params;
    const deletedCount = await cacheDeletePattern(`*${pattern}*`);
    
    log(`Admin cleared cache pattern: ${pattern} (${deletedCount} keys)`, 'cache');
    res.json({ 
      pattern, 
      deletedKeys: deletedCount,
      message: `Cleared ${deletedCount} cache entries matching pattern` 
    });
  } catch (error) {
    log(`Cache clear error: ${(error as Error).message}`, 'error');
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Admin endpoint to get cache statistics
router.get('/cache/stats', requireRole(['admin']), async (req, res) => {
  try {
    const health = await checkCacheHealth();
    
    res.json({
      redis: {
        connected: health.redis,
        latency: health.latency
      },
      encryption: {
        active: true,
        algorithm: 'aes-256-gcm'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log(`Cache stats error: ${(error as Error).message}`, 'error');
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Test endpoint for encryption functionality
router.post('/test', requireRole(['admin']), async (req, res) => {
  try {
    const testData = { message: 'Test encryption data', timestamp: Date.now() };
    
    // Test cache set/get
    const cacheKey = `test:${Date.now()}`;
    await cacheSet(cacheKey, testData, 10); // 10 second TTL
    const retrieved = await cacheGet(cacheKey);
    
    res.json({
      test: 'encryption-cache',
      original: testData,
      retrieved,
      success: JSON.stringify(testData) === JSON.stringify(retrieved),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log(`Encryption test error: ${(error as Error).message}`, 'error');
    res.status(500).json({ error: 'Encryption test failed' });
  }
});

export default router;