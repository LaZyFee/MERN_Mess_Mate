/**
 * Breadcrumb component to show navigation hierarchy
 * @param {Object} props - Component props
 * @param {Array<{href: string, label: string, isCurrent?: boolean}>} props.items - Breadcrumb items
 * @param {React.ReactNode} [props.separator='/'] - Custom separator between items
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size of breadcrumb items
 * @param {boolean} [props.showHomeIcon=false] - Whether to show home icon for first item
 * @param {string} [props.className] - Additional classes
 */
const Breadcrumb = ({
  items = [],
  separator = "/",
  size = "md",
  showHomeIcon = false,
  className = "",
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Base container classes
  const containerClasses = [
    "flex items-center",
    sizeClasses[size],
    className,
  ].join(" ");

  // Current page classes
  const currentClasses = "font-medium text-gray-800";

  // Link classes
  const linkClasses = "text-gray-500 hover:text-gray-700 hover:underline";

  // Separator classes
  const separatorClasses = "mx-2 text-gray-400 flex-shrink-0";

  return (
    <nav aria-label="Breadcrumb" className={containerClasses} {...props}>
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center">
              {index > 0 && (
                <span className={separatorClasses} aria-hidden="true">
                  {typeof separator === "string" ? separator : separator}
                </span>
              )}

              {isLast ? (
                <span className={currentClasses} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className={linkClasses}>
                  {index === 0 && showHomeIcon ? (
                    <div className="inline-flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      {item.label}
                    </div>
                  ) : (
                    item.label
                  )}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
