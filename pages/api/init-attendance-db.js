
import { initializeDatabase } from '../../utils/attendance-db';

export default function handler(req, res) {
  try {
    initializeDatabase();
    res.status(200).json({ success: true, message: 'Attendance database initialized successfully' });
  } catch (error) {
    console.error('Error initializing attendance database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
