/**
 * Card component for content containers
 * @param {Object} props - Component props
 * @param {'elevated'|'outlined'|'filled'|'unstyled'} [props.variant='elevated'] - Card variant
 * @param {'sm'|'md'|'lg'} [props.padding='md'] - Card padding
 * @param {boolean} [props.isHoverable=false] - Whether card has hover effect
 * @param {boolean} [props.isClickable=false] - Whether card appears clickable
 * @param {React.ReactNode} [props.header] - Card header content
 * @param {React.ReactNode} [props.footer] - Card footer content
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional classes
 */
const Card = ({
 variant = "elevated",
 padding = "md",
 isHoverable = false,
 isClickable = false,
 header,
 footer,
 children,
 className = "",
 ...props
}) => {
 // Base card classes
 const baseClasses = "rounded-lg overflow-visible";

 // Variant classes
 const variantClasses = {
  elevated: "bg-(--bgs) shadow-md",
  outlined: "bg-(--bgs) border border-(--bd)",
  filled: "bg-(--bgm)",
  unstyled: "",
 };

 // Padding classes
 const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
 };

 // Interactive classes
 const interactiveClasses = `${
  isHoverable ? "transition-shadow hover:shadow-lg" : ""
 } ${isClickable ? "cursor-pointer transition-transform hover:-translate-y-1" : ""}`;

 const cardClasses = `${baseClasses} ${variantClasses[variant] || ""} ${interactiveClasses} ${className}`;

 const pad = paddingClasses[padding] || paddingClasses.md;

 // Header/footer styles
 const headerClasses = `${pad} border-b border-(--bd)`;

 const bodyClasses = pad;

 const footerClasses = `${pad} border-t border-(--bd)`;

 return (
  <div className={cardClasses} {...props}>
   {header && <div className={headerClasses}>{header}</div>}
   <div className={bodyClasses}>{children}</div>
   {footer && <div className={footerClasses}>{footer}</div>}
  </div>
 );
};

export default Card;
