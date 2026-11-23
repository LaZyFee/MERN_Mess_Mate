import React, { forwardRef, useState, useRef, useEffect } from "react";
import Button from "@/components/shared/Button";
import { LuPlus, LuImageUp, LuFile, LuX } from "react-icons/lu";

/**
 * FileInput component for handling file/image uploads
 * @param {Object} props - Component props
 * @param {'outline'|'filled'|'flushed'} [props.variant='outline'] - Input variant
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Input size
 * @param {boolean} [props.isInvalid=false] - Error state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.isBlocked=false] - Blocked state (uneditable, grayed out)
 * @param {boolean} [props.isRequired=false] - Required state
 * @param {string} [props.errorMessage] - Error message
 * @param {string} [props.helperText] - Helper text
 * @param {string} [props.label] - Input label
 * @param {string} [props.className] - Additional classes
 * @param {boolean} [props.showPreview=true] - Whether to show image preview
 * @param {string} [props.accept='.jpg,.jpeg,.png,.gif'] - Accepted file types
 * @param {number} [props.maxFileSize=5] - Maximum file size in MB
 * @param {boolean} [props.multiple=false] - Allow multiple file uploads
 * @param {boolean} [props.compact=false] - Use compact mode for tables and tight spaces
 * @param {boolean} [props.hideLabel=false] - Hide the label for compact UIs
 * @param {function} [props.onFileValidationError] - Callback for file validation errors
 */
const FileInput = forwardRef(
 (
  {
   name,
   variant = "outline",
   size = "md",
   isInvalid = false,
   isDisabled = false,
   isBlocked = false,
   isRequired = false,
   errorMessage,
   helperText,
   label,
   className = "",
   id,
   showPreview = true,
   accept = ".jpg,.jpeg,.png,.gif",
   maxFileSize = 5, // in MB
   multiple = false,
   compact = false,
   hideLabel = false,
   onFileValidationError,
   onChange,
   ...props
  },
  ref,
 ) => {
  // Generate ID if not provided
  const fileInputId =
   id || `file-input-${Math.random().toString(36).substring(2, 9)}`;
  const [previewUrls, setPreviewUrls] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Clean up URLs on unmount
  useEffect(() => {
   return () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
   };
  }, [previewUrls]);

  const validateFiles = (files) => {
   const validFiles = [];
   const errors = [];

   Array.from(files).forEach((file) => {
    // Check file type
    if (
     accept &&
     accept !== "*" &&
     !accept.split(",").some((type) => {
      // Handle mime types vs file extensions
      if (type.startsWith(".")) {
       return file.name.toLowerCase().endsWith(type.toLowerCase());
      } else {
       return file.type.match(type.replace("*", ".*"));
      }
     })
    ) {
     errors.push({ file, error: "File type not accepted" });
     return;
    }

    // Check file size
    if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
     errors.push({ file, error: `File size exceeds ${maxFileSize}MB` });
     return;
    }

    validFiles.push(file);
   });

   return { validFiles, errors };
  };

  const handleChange = (e) => {
   e.preventDefault();
   if (isDisabled || isBlocked) return;

   const files = e.target.files;

   if (!files || files.length === 0) return;

   const { validFiles, errors } = validateFiles(files);

   if (errors.length > 0 && onFileValidationError) {
    onFileValidationError(errors);
   }

   if (validFiles.length > 0) {
    // Display previews for valid files
    if (showPreview) {
     const newPreviewUrls = validFiles
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => URL.createObjectURL(file));

     setPreviewUrls((prev) =>
      multiple ? [...prev, ...newPreviewUrls] : newPreviewUrls,
     );
    }

    // Update file names for UI
    const newFileNames = validFiles.map((file) => file.name);
    setFileNames((prev) =>
     multiple ? [...prev, ...newFileNames] : newFileNames,
    );

    // Call original onChange with a synthetic event
    if (onChange) {
     const syntheticEvent = { ...e };
     syntheticEvent.target = {
      ...e.target,
      files: multiple ? validFiles : validFiles[0],
      value: multiple ? validFiles : validFiles[0],
      name: name,
     };
     onChange(syntheticEvent);
    }
   }
  };

  const handleDrag = (e) => {
   e.preventDefault();
   e.stopPropagation();

   if (isDisabled || isBlocked) return;

   if (e.type === "dragenter" || e.type === "dragover") {
    setDragActive(true);
   } else if (e.type === "dragleave") {
    setDragActive(false);
   }
  };

  const handleDrop = (e) => {
   e.preventDefault();
   e.stopPropagation();
   setDragActive(false);

   if (isDisabled || isBlocked) return;

   if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const syntheticEvent = { ...e };
    syntheticEvent.target = { ...e.target, files: e.dataTransfer.files };
    handleChange(syntheticEvent);
   }
  };

  const removeFile = (index) => {
   if (isDisabled || isBlocked) return;

   setFileNames((prev) => {
    const updated = [...prev];
    updated.splice(index, 1);
    return updated;
   });

   setPreviewUrls((prev) => {
    const updated = [...prev];
    if (updated[index]) {
     URL.revokeObjectURL(updated[index]);
     updated.splice(index, 1);
    }
    return updated;
   });

   // Call original onChange with updated files
   if (onChange && fileInputRef.current) {
    const dt = new DataTransfer();
    const files = fileInputRef.current.files;

    for (let i = 0; i < files.length; i++) {
     if (i !== index) dt.items.add(files[i]);
    }

    fileInputRef.current.files = dt.files;

    const syntheticEvent = {
     target: { name: name, files: dt.files, value: dt.files },
    };
    onChange(syntheticEvent);
   }
  };

  const triggerFileInput = () => {
   if (!isDisabled && !isBlocked) {
    fileInputRef.current.click();
   }
  };

  // Base classes
  const baseClasses = "transition-colors focus:outline-none";

  // Size classes
  const sizeClasses = {
   sm: "text-xs",
   md: "text-sm",
   lg: "text-base",
  };

  // Variant classes
  const variantClasses = {
   outline:
    "border-2 border-dashed border-(--bd2) rounded-md hover:border-(--bd3)",
   filled:
    "bg-(--bgm) border-2 border-dashed border-transparent rounded-md hover:bg-(--bgl)",
   flushed:
    "border-b-2 border-dashed border-(--bd2) rounded-none hover:border-(--bd3)",
  };

  // State classes
  const stateClasses = {
   dragActive: "bg-(--info-bg) border-(--info)",
   invalid: "border-(--danger)",
   disabled: "opacity-60 cursor-not-allowed bg-(--bgm)",
   blocked: "opacity-70 cursor-not-allowed bg-(--bgl) pointer-events-none",
  };

  // Label classes
  const labelClasses = {
   base: "block text-(--ts) mb-1",
   sm: "text-xs",
   md: "text-sm",
   lg: "text-base",
   disabled: "opacity-60",
   blocked: "opacity-70",
   invalid: "text-(--danger)",
  };

  // Helper text classes
  const helperTextClasses = "mt-1 text-xs text-(--tm)";

  // Error message classes
  const errorMessageClasses = "mt-1 text-xs text-(--danger)";

  // Style the dropzone based on compact mode
  const dropzoneClasses = compact
   ? [
     baseClasses,
     variantClasses[variant],
     sizeClasses[size],
     dragActive ? stateClasses.dragActive : "",
     isInvalid ? stateClasses.invalid : "",
     isDisabled ? stateClasses.disabled : "",
     isBlocked ? stateClasses.blocked : "",
     "cursor-pointer flex items-center justify-center w-12 h-12",
     className,
    ].join(" ")
   : [
     baseClasses,
     variantClasses[variant],
     sizeClasses[size],
     dragActive ? stateClasses.dragActive : "",
     isInvalid ? stateClasses.invalid : "",
     isDisabled ? stateClasses.disabled : "",
     isBlocked ? stateClasses.blocked : "",
     isDisabled || isBlocked ? "cursor-not-allowed" : "cursor-pointer",
     "flex flex-col items-center justify-center p-6",
     fileNames.length && !showPreview ? "py-3" : "py-6",
     className,
    ].join(" ");

  const inputLabelClassNames = [
   labelClasses.base,
   labelClasses[size],
   isDisabled ? labelClasses.disabled : "",
   isBlocked ? labelClasses.blocked : "",
   isInvalid ? labelClasses.invalid : "",
  ].join(" ");

  // Render the compact version
  if (compact) {
   return (
    <div className="w-full">
     {!hideLabel && label && (
      <label htmlFor={fileInputId} className={inputLabelClassNames}>
       {label}
       {isRequired && <span className="text-(--danger) ml-1">*</span>}
      </label>
     )}

     <div className="flex items-center">
      {/* Compact view with preview if available */}
      {showPreview && previewUrls.length > 0 ? (
       <div className="relative w-12 h-12 mr-2 border rounded">
        <img
         src={previewUrls[0]}
         alt="Preview"
         className="object-cover w-full h-full rounded"
        />
        {!(isDisabled || isBlocked) && (
         <Button
          type="button"
          onClick={() => removeFile(0)}
          className="absolute -top-1 -right-1 bg-(--danger) text-(--bgs) rounded-full w-4 h-4 flex items-center justify-center text-xs"
         >
          ×
         </Button>
        )}
       </div>
      ) : (
       <div
        className={dropzoneClasses}
        onClick={triggerFileInput}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
       >
        <LuPlus
         className={`h-5 w-5 ${
          isDisabled || isBlocked ? "text-(--tl)" : "text-(--tm)"
         }`}
         aria-hidden="true"
        />
        <input
         ref={(node) => {
          if (ref) {
           if (typeof ref === "function") {
            ref(node);
           } else {
            ref.current = node;
           }
          }
          fileInputRef.current = node;
         }}
         id={fileInputId}
         type="file"
         className="hidden"
         multiple={multiple}
         accept={accept}
         disabled={isDisabled || isBlocked}
         required={isRequired}
         onChange={handleChange}
         name={name}
         {...props}
        />
       </div>
      )}

      {/* Filename for compact view */}
      {fileNames.length > 0 && (
       <span className="text-xs text-(--ts) ml-2 truncate max-w-25">
        {fileNames[0]}
       </span>
      )}
     </div>

     {helperText && !isInvalid && !hideLabel && (
      <div
       id={`${fileInputId}-helper-text`}
       className={helperTextClasses}
      >
       {helperText}
      </div>
     )}

     {isInvalid && errorMessage && !hideLabel && (
      <div
       id={`${fileInputId}-error-message`}
       className={errorMessageClasses}
      >
       {errorMessage}
      </div>
     )}
    </div>
   );
  }

  // For accessibility, we'll use a hidden file input and a custom button
  return (
   <div className="w-full">
    {!hideLabel && label && (
     <label htmlFor={fileInputId} className={inputLabelClassNames}>
      {label}
      {isRequired && <span className="text-(--danger) ml-1">*</span>}
     </label>
    )}

    <div
     className={dropzoneClasses}
     onClick={triggerFileInput}
     onDragEnter={handleDrag}
     onDragLeave={handleDrag}
     onDragOver={handleDrag}
     onDrop={handleDrop}
    >
     <input
      name={name}
      ref={(node) => {
       // Handle both refs
       if (ref) {
        if (typeof ref === "function") {
         ref(node);
        } else {
         ref.current = node;
        }
       }
       fileInputRef.current = node;
      }}
      id={fileInputId}
      type="file"
      className="hidden"
      multiple={multiple}
      accept={accept}
      disabled={isDisabled || isBlocked}
      required={isRequired}
      onChange={handleChange}
      {...props}
     />

     {fileNames.length === 0 ? (
      <div className="text-center">
       <LuImageUp
        className={`mx-auto h-12 w-12 ${
         isDisabled || isBlocked ? "text-(--tl)" : "text-(--tm)"
        }`}
        aria-hidden="true"
       />
       <p className="mt-2 text-sm text-(--tm)">
        {isDisabled || isBlocked
         ? `File upload ${isDisabled ? "disabled" : "blocked"}`
         : `Drag 'n' drop ${
           multiple ? "files" : "a file"
          } here, or click to select ${
           multiple ? "files" : "a file"
          }`}
       </p>
       <p className="mt-1 text-xs text-(--tl)">
        {accept.split(",").join(", ")}
        {maxFileSize ? ` · Max file size: ${maxFileSize}MB` : ""}
       </p>
      </div>
     ) : (
      <>
       {/* File list when previews are not shown or for non-image files */}
       {(!showPreview || previewUrls.length === 0) && (
        <div className="w-full">
         {fileNames.map((name, index) => (
          <div
           key={index}
           className="flex items-center justify-between py-1"
          >
           <div className="flex items-center">
            <LuFile size={16} className="text-(--tl) mr-2" />
            <span className="text-sm truncate max-w-xs">
             {name}
            </span>
           </div>
           {!(isDisabled || isBlocked) && (
            <Button
             type="button"
             onClick={(e) => {
              e.stopPropagation();
              removeFile(index);
             }}
             className="text-(--tl) hover:text-(--tm)"
            >
             <LuX size={16} />
            </Button>
           )}
          </div>
         ))}
         {!(isDisabled || isBlocked) && (
          <Button
           type="button"
           disabled={isDisabled || isBlocked}
           onClick={triggerFileInput}
           className={`mt-2 px-3 py-1 text-xs rounded-md border border-(--bd2)
           ${
            isDisabled || isBlocked
             ? "opacity-50 cursor-not-allowed"
             : "hover:bg-(--bgm)"
           }`}
          >
           {multiple ? "Add more files" : "Change file"}
          </Button>
         )}
        </div>
       )}

       {/* Image previews */}
       {showPreview && previewUrls.length > 0 && (
        <div className="w-full">
         {previewUrls.map((url, index) => (
          <div
           key={index}
           className="flex items-center justify-between py-1"
          >
           <div className="flex items-center">
            <LuFile size={16} className="text-(--tl) mr-2 shrink-0" />
            <span className="text-sm text-(--ts) truncate max-w-[calc(100%-3rem)]">
             {fileNames[index] || `Image ${index + 1}`}
            </span>
           </div>
           {!(isDisabled || isBlocked) && (
            <Button
             type="button"
             onClick={(e) => {
              e.stopPropagation();
              removeFile(index);
             }}
             className="text-(--tl) hover:text-(--tm)"
            >
             <LuX size={16} />
            </Button>
           )}
          </div>
         ))}
         {multiple && !(isDisabled || isBlocked) && (
          <Button
           type="button"
           onClick={triggerFileInput}
           className="mt-2 px-3 py-1 text-xs rounded-md border border-(--bd2) hover:bg-(--bgm)"
          >
           Add more files
          </Button>
         )}
        </div>
       )}
      </>
     )}
    </div>

    {helperText && !isInvalid && !hideLabel && (
     <div id={`${fileInputId}-helper-text`} className={helperTextClasses}>
      {helperText}
     </div>
    )}

    {isInvalid && errorMessage && !hideLabel && (
     <div
      id={`${fileInputId}-error-message`}
      className={errorMessageClasses}
     >
      {errorMessage}
     </div>
    )}
   </div>
  );
 },
);

FileInput.displayName = "FileInput";

export default FileInput;
