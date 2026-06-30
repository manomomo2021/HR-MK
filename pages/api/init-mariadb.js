
import { initializeDatabase } from '../../utils/mariadb';

export default function handler(req, res) {
  try {
    initializeDatabase().then(result => {
      if (result.success) {
        res.status(200).json({ success: true, message: 'MariaDB database initialized successfully' });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    }).catch(error => {
      console.error('Error initializing MariaDB database:', error);
      res.status(500).json({ success: false, error: error.message });
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
