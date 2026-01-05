const { TooManyRequestsError } = require('../utils/errors');

const dailyPostLimit = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const today = new Date().toISOString().split('T')[0];
  const lastPostDate = req.user.last_post_date;

  if (lastPostDate && lastPostDate.toISOString().split('T')[0] === today) {
    return next(new TooManyRequestsError('You can only post one comment per day'));
  }

  next();
};

module.exports = { dailyPostLimit };
