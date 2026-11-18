/**
 * Progress component for displaying progress indicators
 * @param {Object} props - Component props
 * @param {number} props.value - Current progress value (0-100)
 * @param {number} [props.min=0] - Minimum value
 * @param {number} [props.max=100] - Maximum value
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Progress bar height
 * @param {'line'|'circle'} [props.variant='line'] - Progress variant
 * @param {string} [props.colorScheme='primary'] - Color scheme
 * @param {boolean} [props.hasStripe=false] - Whether to show stripe pattern
 * @param {boolean} [props.isAnimated=false] - Whether stripe pattern is animated
 * @param {boolean} [props.isIndeterminate=false] - Whether progress is indeterminate
 * @param {string} [props.label] - Optional label to display
 * @param {boolean} [props.showPercentage=false] - Whether to show percentage
 * @param {string} [props.className] - Additional classes
 */
const Progress = ({
  value,
  min = 0,
  max = 100,
  size = "md",
  variant = "line",
  colorScheme = "primary",
  hasStripe = false,
  isAnimated = false,
  isIndeterminate = false,
  label,
  showPercentage = false,
  className = "",
  ...props
}) => {
  // Calculate percentage
  const percent = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100),
  );

  // Size classes for linear progress
  const sizeClasses = {
    sm: "h-1",
    md: "h-2.5",
    lg: "h-4",
  };

  // Circle size classes
  const circleSizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  // Get color class based on CSS variable
  const getColorClass = () => {
    switch (colorScheme) {
      case "primary":
        return "bg-(--p)";
      case "secondary":
        return "bg-(--p2)";
      case "danger":
        return "bg-red-500";
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-(--p)";
    }
  };

  const getTextColorClass = () => {
    switch (colorScheme) {
      case "primary":
        return "text-(--p)";
      case "secondary":
        return "text-(--p2)";
      case "danger":
        return "text-red-500";
      case "success":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      default:
        return "text-(--p)";
    }
  };

  // Linear progress bar
  if (variant === "line") {
    return (
      <div className={`w-full ${className}`} {...props}>
        {(label || showPercentage) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <span className="text-sm font-medium text-(--ts)">{label}</span>
            )}
            {showPercentage && (
              <span className="text-sm font-medium text-(--ts)">
                {percent.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        <div className={`w-full bg-(--bd2) rounded-full ${sizeClasses[size]}`}>
          <div
            className={`
              ${getColorClass()} rounded-full
              ${sizeClasses[size]} 
              ${hasStripe ? "bg-stripes" : ""} 
              ${isAnimated && hasStripe ? "animate-progress-stripes" : ""}
              ${isIndeterminate ? "animate-progress-indeterminate w-3/12" : ""}
            `}
            style={{ width: isIndeterminate ? undefined : `${percent}%` }}
            role="progressbar"
            aria-valuenow={isIndeterminate ? undefined : value}
            aria-valuemin={min}
            aria-valuemax={max}
          ></div>
        </div>
      </div>
    );
  }

  // Circular progress
  const circleSize = 50; // SVG viewport size
  const strokeWidth = size === "sm" ? 4 : size === "md" ? 5 : 6;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  // Get stroke color
  const getStrokeColor = () => {
    switch (colorScheme) {
      case "primary":
        return "stroke-(--p)";
      case "secondary":
        return "stroke-(--p2)";
      case "danger":
        return "stroke-red-500";
      case "success":
        return "stroke-green-500";
      case "warning":
        return "stroke-yellow-500";
      default:
        return "stroke-(--p)";
    }
  };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuemin={min}
      aria-valuemax={max}
      {...props}
    >
      <div className={`relative ${circleSizeClasses[size]}`}>
        <svg
          className={`w-full h-full ${isIndeterminate ? "animate-spin-slow" : ""}`}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
        >
          {/* Background circle */}
          <circle
            className="stroke-(--bd2)"
            stroke="currentColor"
            fill="none"
            strokeWidth={strokeWidth}
            r={radius}
            cx={circleSize / 2}
            cy={circleSize / 2}
          />

          {/* Progress circle */}
          <circle
            className={`${getStrokeColor()} ${isIndeterminate ? "opacity-25" : ""}`}
            stroke="currentColor"
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
            r={radius}
            cx={circleSize / 2}
            cy={circleSize / 2}
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
          />
        </svg>

        {/* Center text */}
        {showPercentage && !isIndeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-medium ${getTextColorClass()}`}>
              {percent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <span className={`mt-2 text-sm font-medium ${getTextColorClass()}`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default Progress;
