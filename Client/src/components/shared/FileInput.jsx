import React, { forwardRef, useState, useRef, useEffect } from "react";
import Button from "@/components/shared/buttons/Button";

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
        "border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400",
      filled:
        "bg-gray-100 border-2 border-dashed border-transparent rounded-md hover:bg-gray-200",
      flushed:
        "border-b-2 border-dashed border-gray-300 rounded-none hover:border-gray-400",
    };

    // State classes
    const stateClasses = {
      dragActive: "bg-blue-50 border-blue-400",
      invalid: "border-red-500",
      disabled: "opacity-60 cursor-not-allowed bg-gray-100",
      blocked: "opacity-70 cursor-not-allowed bg-gray-200 pointer-events-none",
    };

    // Label classes
    const labelClasses = {
      base: "block text-gray-700 mb-1",
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
      disabled: "opacity-60",
      blocked: "opacity-70",
      invalid: "text-red-600",
    };

    // Helper text classes
    const helperTextClasses = "mt-1 text-xs text-gray-500";

    // Error message classes
    const errorMessageClasses = "mt-1 text-xs text-red-600";

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
              {isRequired && <span className="text-red-500 ml-1">*</span>}
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
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
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
                <svg
                  className={`h-5 w-5 ${
                    isDisabled || isBlocked ? "text-gray-400" : "text-gray-500"
                  }`}
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
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
              <span className="text-xs text-gray-600 ml-2 truncate max-w-25">
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
            {isRequired && <span className="text-red-500 ml-1">*</span>}
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
              <svg
                className={`mx-auto h-12 w-12 ${
                  isDisabled || isBlocked ? "text-gray-400" : "text-gray-500"
                }`}
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                {isDisabled || isBlocked
                  ? `File upload ${isDisabled ? "disabled" : "blocked"}`
                  : `Drag 'n' drop ${
                      multiple ? "files" : "a file"
                    } here, or click to select ${
                      multiple ? "files" : "a file"
                    }`}
              </p>
              <p className="mt-1 text-xs text-gray-400">
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
                        <svg
                          className="h-4 w-4 text-gray-400 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
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
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  ))}
                  {!(isDisabled || isBlocked) && (
                    <Button
                      type="button"
                      disabled={isDisabled || isBlocked}
                      onClick={triggerFileInput}
                      className={`mt-2 px-3 py-1 text-xs rounded-md border border-gray-300 
                      ${
                        isDisabled || isBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50"
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
                        <svg
                          className="h-4 w-4 text-gray-400 mr-2 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm text-gray-600 truncate max-w-[calc(100%-3rem)]">
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
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  ))}
                  {multiple && !(isDisabled || isBlocked) && (
                    <Button
                      type="button"
                      onClick={triggerFileInput}
                      className="mt-2 px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
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
