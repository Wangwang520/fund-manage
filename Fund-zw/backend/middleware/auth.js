const jwt = require('jsonwebtoken');

module.exports = (useMemoryStore, memoryStore) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ success: false, message: '未提供认证 token' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('认证失败:', error);
      res.status(401).json({ success: false, message: '无效的认证 token' });
    }
  };
};
