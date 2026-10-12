export function notFound(req, res) { res.status(404).json({ message: 'The requested resource was not found.' }); }
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Please check the submitted information.' });
  if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
}
