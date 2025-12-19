export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

export const formatShortCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '0';
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + ' tỷ';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'tr';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'k';
  return amount;
};

export const getRandomColor = () => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
    '#8B5CF6', '#EC4899', '#F43F5E', '#84CC16', '#06B6D4',
    '#0EA5E9', '#64748B', '#A855F7', '#D946EF',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};
