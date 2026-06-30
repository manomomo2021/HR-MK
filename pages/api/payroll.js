const { getPayrolls, savePayroll } = require('../../utils/db');

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        const { month, year } = req.query;
        const result = await getPayrolls(month, year);
        return result.success
          ? res.status(200).json({ success: true, data: result.data })
          : res.status(500).json({ success: false, error: result.error });

      case 'POST':
      case 'PUT':
        const payrollResult = await savePayroll(req.body);
        return payrollResult.success
          ? res.status(req.method === 'POST' ? 201 : 200).json({
            success: true,
            message: `Payroll record ${req.method === 'POST' ? 'created' : 'updated'} successfully`,
            id: payrollResult.data?.lastInsertRowid
          })
          : res.status(500).json({ success: false, error: payrollResult.error });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
