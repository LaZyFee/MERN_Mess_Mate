import TravelLoader from "./TravelLoader";

/**
 * Loading component for displaying loading states
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size of the loading spinner
 * @param {string} [props.color='primary'] - Color scheme (using CSS variables)
 * @param {boolean} [props.fullScreen=false] - Whether to display as full screen overlay
 * @param {string} [props.text] - Optional text to display with the spinner
 * @param {string} [props.className] - Additional classes
 */
const Loading = ({
  size = "md",
  color = "primary",
  fullScreen = false,
  text,
  className = "",
  ...props
}) => {
  // Size classes for the spinner
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-3",
    lg: "h-16 w-16 border-4",
  };

  // Get color class based on CSS variable
  const getColorClass = () => {
    switch (color) {
      case "primary":
        return "border-(--p)";
      case "secondary":
        return "border-(--p2)";
      case "white":
        return "border-white";
      case "danger":
        return "border-red-500";
      case "success":
        return "border-green-500";
      default:
        return "border-(--p)";
    }
  };

  const spinnerClasses = `
    animate-spin rounded-full
    border-t-transparent
    ${getColorClass()}
    ${sizeClasses[size]}
  `;

  const content = (
    <div
      className={`flex flex-col items-center justify-center w-full min-h-[200px] ${className}`}
      {...props}
    >
      <div className={spinnerClasses}></div>
      {text && <p className="mt-4 text-sm text-(--tm)">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <TravelLoader />;
  }

  return content;
};

export default Loading;
