const { getLoans, saveLoan } = require('../../utils/db');

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        const { status } = req.query;
        const result = await getLoans(status || 'approved');
        return result.success
          ? res.status(200).json({ success: true, data: result.data })
          : res.status(500).json({ success: false, error: result.error });

      case 'POST':
      case 'PUT':
        const loanResult = await saveLoan(req.body);
        return loanResult.success
          ? res.status(req.method === 'POST' ? 201 : 200).json({
            success: true,
            message: `Loan record ${req.method === 'POST' ? 'created' : 'updated'} successfully`,
            id: loanResult.data?.lastInsertRowid
          })
          : res.status(500).json({ success: false, error: loanResult.error });

      case 'DELETE':
        res.status(200).json({ success: true, message: 'Loan record deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
