const { initializeDatabase } = require('../../utils/db');

export default async function handler(req, res) {
  try {
    const result = await initializeDatabase();
    if (!result || result.success) {
      res.status(200).json({ success: true, message: 'Database initialized successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
