export const normalizeBusNumber = (busNumber) => {
  if (!busNumber) return '';
  return busNumber
    .toString()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .trim();
};
