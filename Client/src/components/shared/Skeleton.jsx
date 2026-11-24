/**
 * Skeleton component for loading states
 * @param {Object} props - Component props
 * @param {'text'|'circle'|'rect'} [props.variant='text'] - Skeleton shape variant
 * @param {number|string} [props.width] - Width of skeleton
 * @param {number|string} [props.height] - Height of skeleton
 * @param {boolean} [props.isAnimated=true] - Whether to show animation
 * @param {number} [props.borderRadius] - Border radius for rect variant
 * @param {string} [props.className] - Additional classes
 */
const Skeleton = ({
 variant = "text",
 width,
 height,
 isAnimated = true,
 borderRadius,
 className = "",
 ...props
}) => {
 // Base classes for all skeletons
 const baseClasses = [
  "bg-(--bd2)",
  isAnimated ? "animate-pulse" : "",
  className,
 ];

 // Styles for different variants — dimensions/radius via CSS vars + Tailwind
 // arbitrary values; no inline style objects (§1.1)
 const variantStyles = {
  text: { classes: "rounded" },
  circle: { classes: "rounded-full" },
  rect: { classes: "" },
 };

 const defaultWidth =
  variant === "text" ? "100%" : variant === "circle" ? width || "3rem" : "100%";
 const defaultHeight =
  variant === "text"
   ? "1rem"
   : variant === "circle"
    ? height || width || "3rem"
    : height || "100px";
 const radius =
  borderRadius
   ? `${borderRadius}px`
   : variant === "circle"
    ? "50%"
    : variant === "rect"
     ? "0.75rem"
     : undefined;

 const classes = [
  ...baseClasses,
  variantStyles[variant].classes,
  "[width:var(--sk-width)] [height:var(--sk-height)]",
  ...(radius ? ["[border-radius:var(--sk-radius)]"] : []),
 ]
  .filter(Boolean)
  .join(" ");

 return (
  <div
   className={classes}
   style={{
    "--sk-width": width || defaultWidth,
    "--sk-height": height || defaultHeight,
    ...(radius ? { "--sk-radius": radius } : {}),
   }}
   {...props}
  />
 );
};

/**
 * SkeletonText component for multiple lines of text skeletons
 * @param {Object} props - Component props
 * @param {number} [props.lines=3] - Number of lines
 * @param {number} [props.spacing=2] - Space between lines (Tailwind spacing scale)
 * @param {boolean} [props.isAnimated=true] - Whether to show animation
 * @param {Array<number>} [props.widths] - Array of widths for each line (percentage)
 * @param {string} [props.className] - Additional classes
 */
export const SkeletonText = ({
 lines = 3,
 spacing = 2,
 isAnimated = true,
 widths,
 className = "",
 ...props
}) => {
 // Generate default widths if none provided
 const getWidths = () => {
  if (Array.isArray(widths) && widths.length >= lines) {
   return widths.slice(0, lines);
  }

  // Default pattern: full, 80%, 90%, 75%, etc.
  return Array(lines)
   .fill(0)
   .map((_, i) => {
    if (i === 0) return 100;
    const random = [75, 80, 85, 90, 95];
    return random[i % random.length];
   });
 };

 const lineWidths = getWidths();

 return (
  <div className={`space-y-${spacing} w-full ${className}`} {...props}>
   {Array(lines)
    .fill(0)
    .map((_, i) => (
     <Skeleton
      key={i}
      variant="text"
      width={`${lineWidths[i]}%`}
      isAnimated={isAnimated}
     />
    ))}
  </div>
 );
};

/**
 * SkeletonAvatar component for avatar placeholders
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md'] - Avatar size
 * @param {boolean} [props.isAnimated=true] - Whether to show animation
 * @param {string} [props.className] - Additional classes
 */
export const SkeletonAvatar = ({
 size = "md",
 isAnimated = true,
 className = "",
 ...props
}) => {
 const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
 };

 return (
  <Skeleton
   variant="circle"
   width={sizeClasses[size].split(" ")[0]}
   height={sizeClasses[size].split(" ")[1]}
   isAnimated={isAnimated}
   className={className}
   {...props}
  />
 );
};

/**
 * SkeletonButton component for button placeholders
 * @param {Object} props - Component props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Button size
 * @param {boolean} [props.isAnimated=true] - Whether to show animation
 * @param {string} [props.className] - Additional classes
 */
export const SkeletonButton = ({
 size = "md",
 isAnimated = true,
 className = "",
 ...props
}) => {
 const sizeClasses = {
  sm: "h-8 w-20",
  md: "h-10 w-28",
  lg: "h-12 w-32",
 };

 return (
  <Skeleton
   variant="rect"
   width={sizeClasses[size].split(" ")[1]}
   height={sizeClasses[size].split(" ")[0]}
   isAnimated={isAnimated}
   borderRadius={12}
   className={className}
   {...props}
  />
 );
};

/**
 * SkeletonCard component for card placeholders
 * @param {Object} props - Component props
 * @param {boolean} [props.hasImage=true] - Whether to show image placeholder
 * @param {number} [props.imageHeight=160] - Height of image placeholder
 * @param {number} [props.lines=3] - Number of text lines
 * @param {boolean} [props.isAnimated=true] - Whether to show animation
 * @param {string} [props.className] - Additional classes
 */
export const SkeletonCard = ({
 hasImage = true,
 imageHeight = 160,
 lines = 3,
 isAnimated = true,
 className = "",
 ...props
}) => {
 return (
  <div
   className={`bg-(--bgs) rounded-2xl overflow-hidden shadow-(--shadow-sm) ${className}`}
   {...props}
  >
   {hasImage && (
    <Skeleton
     variant="rect"
     height={imageHeight}
     isAnimated={isAnimated}
     borderRadius={0}
    />
   )}
   <div className="p-5">
    <SkeletonText lines={lines} isAnimated={isAnimated} spacing={2} />
   </div>
  </div>
 );
};

export default Skeleton;
