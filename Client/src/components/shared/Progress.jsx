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
        return "bg-(--danger)";
      case "success":
        return "bg-(--success)";
      case "warning":
        return "bg-(--warning)";
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
        return "text-(--danger)";
      case "success":
        return "text-(--success)";
      case "warning":
        return "text-(--warning)";
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
  // Circular progress — CSS conic-gradient, no inline SVG (§1.4)
  const deg = Math.round((percent / 100) * 360);

  const getCircleTextColor = () => {
    switch (colorScheme) {
      case "primary":
        return "text-(--p)";
      case "secondary":
        return "text-(--p2)";
      case "danger":
        return "text-(--danger)";
      case "success":
        return "text-(--success)";
      case "warning":
        return "text-(--warning)";
      default:
        return "text-(--p)";
    }
  };

  const getCircleBgColor = () => {
    switch (colorScheme) {
      case "primary":
        return "bg-(--p)";
      case "secondary":
        return "bg-(--p2)";
      case "danger":
        return "bg-(--danger)";
      case "success":
        return "bg-(--success)";
      case "warning":
        return "bg-(--warning)";
      default:
        return "bg-(--p)";
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
        {/* Background track */}
        <div
          className="w-full h-full rounded-full border-8 border-(--bd2) flex items-center justify-center"
          style={{ "--progress-deg": `${deg}deg` }}
        >
          {/* Progress ring — conic-gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from -90deg, var(--progress-ring-color) 0deg, var(--progress-ring-color) ${deg}deg, transparent ${deg}deg)`,
              "--progress-ring-color": getCircleBgColor().replace("bg-", "text-"),
            }}
          >
            {/* Inner mask to create ring effect */}
            <div className="absolute inset-[8px] rounded-full bg-[var(--bg)]" />
          </div>
        </div>

        {/* Center text */}
        {showPercentage && !isIndeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-medium ${getCircleTextColor()}`}>
              {percent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <span className={`mt-2 text-sm font-medium ${getCircleTextColor()}`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default Progress;
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