export const Card = ({ children, className = '', ...props }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Badge = ({ color, children }) => (
  <span
    className="px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold text-white shadow-sm whitespace-nowrap inline-block"
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);
