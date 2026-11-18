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
    elevated: "bg-white shadow-md",
    outlined: "bg-white border border-gray-200",
    filled: "bg-gray-100",
    unstyled: "",
  };

  // Padding classes
  const paddingClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  // Interactive classes
  const interactiveClasses = [
    isHoverable ? "transition-shadow hover:shadow-lg" : "",
    isClickable
      ? "cursor-pointer transition-transform hover:-translate-y-1"
      : "",
  ].join(" ");

  const cardClasses = [
    baseClasses,
    variantClasses[variant],
    interactiveClasses,
    className,
  ].join(" ");

  // Header/footer styles
  const headerClasses = [
    paddingClasses[padding],
    "border-b border-gray-200",
  ].join(" ");

  const bodyClasses = paddingClasses[padding];

  const footerClasses = [
    paddingClasses[padding],
    "border-t border-gray-200",
  ].join(" ");

  return (
    <div className={cardClasses} {...props}>
      {header && <div className={headerClasses}>{header}</div>}
      <div className={bodyClasses}>{children}</div>
      {footer && <div className={footerClasses}>{footer}</div>}
    </div>
  );
};

export default Card;
