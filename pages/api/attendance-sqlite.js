const { getAttendance, saveAttendance } = require('../../utils/db');

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { employeeId, month } = req.query;
        const result = await getAttendance(employeeId, month);
        if (result.success) {
          res.status(200).json({ success: true, data: result.data });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    case 'POST':
      try {
        const result = await saveAttendance(req.body);
        if (result.success) {
          res.status(200).json({ success: true, message: 'Attendance record saved successfully' });
        } else {
          res.status(500).json({ success: false, error: result.error });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
