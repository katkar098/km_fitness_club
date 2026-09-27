const moment = require('moment');

const formatDate = (date, format = 'DD/MM/YYYY') => {
  return moment(date).format(format);
};

const formatDateTime = (date, format = 'DD/MM/YYYY HH:mm') => {
  return moment(date).format(format);
};

const getCurrentDate = (format = 'YYYY-MM-DD') => {
  return moment().format(format);
};

const getCurrentDateTime = (format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment().format(format);
};

const addDays = (date, days) => {
  return moment(date).add(days, 'days').toDate();
};

const subtractDays = (date, days) => {
  return moment(date).subtract(days, 'days').toDate();
};

const differenceInDays = (date1, date2) => {
  return moment(date1).diff(moment(date2), 'days');
};

const isDateExpired = (date) => {
  return moment().isAfter(moment(date));
};

const getMembershipEndDate = (startDate, duration, unit = 'months') => {
  return moment(startDate).add(duration, unit).toDate();
};

module.exports = {
  formatDate,
  formatDateTime,
  getCurrentDate,
  getCurrentDateTime,
  addDays,
  subtractDays,
  differenceInDays,
  isDateExpired,
  getMembershipEndDate
};