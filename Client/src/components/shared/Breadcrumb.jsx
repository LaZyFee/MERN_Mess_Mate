/**
 * Breadcrumb component to show navigation hierarchy
 * @param {Object} props - Component props
 * @param {Array<{href: string, label: string, isCurrent?: boolean}>} props.items - Breadcrumb items
 * @param {React.ReactNode} [props.separator='/'] - Custom separator between items
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size of breadcrumb items
 * @param {boolean} [props.showHomeIcon=false] - Whether to show home icon for first item
 * @param {string} [props.className] - Additional classes
 */
import { LuHouse } from "react-icons/lu";

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
 const currentClasses = "font-medium text-(--tp)";

 // Link classes
 const linkClasses = "text-(--tm) hover:text-(--ts) hover:underline";

 // Separator classes
 const separatorClasses = "mx-2 text-(--tl) flex-shrink-0";

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
           <LuHouse size={16} className="mr-1" />
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
