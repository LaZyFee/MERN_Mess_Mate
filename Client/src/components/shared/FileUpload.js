"use client";

import { useEffect, useRef, useState } from "react";
import { FiUpload, FiFile, FiX, FiCheck } from "react-icons/fi";
import Button from "@/components/shared/Button";

export const FileUpload = ({
 label,
 accept = "image/*,.pdf",
 maxSizeMB = 5,
 value,
 onChange,
 onRemove,
 helperText,
 isInvalid,
 errorMessage,
 isRequired,
 previewUrl,
 existingFileName,
 compact = false,
 multiple = false,
}) => {
 const [isDragging, setIsDragging] = useState(false);
 const [preview, setPreview] = useState(previewUrl || null);
 const [localError, setLocalError] = useState("");
 const [selectedFiles, setSelectedFiles] = useState([]);
 const inputRef = useRef(null);

 useEffect(() => {
  if (!multiple) {
   setPreview(previewUrl || null);
   if (!previewUrl && inputRef.current) {
    inputRef.current.value = "";
   }
  }
 }, [previewUrl, multiple]);

 const validateFile = (file) => {
  const accepts = accept
   .split(",")
   .map((item) => item.trim().toLowerCase())
   .filter(Boolean);

  const fileName = (file.name || "").toLowerCase();
  const fileType = (file.type || "").toLowerCase();
  const isAccepted =
   accepts.length === 0 ||
   accepts.some((rule) => {
    if (rule.endsWith("/*")) {
     const prefix = rule.slice(0, -1);
     return fileType.startsWith(prefix);
    }
    if (rule.startsWith(".")) {
     return fileName.endsWith(rule);
    }
    return fileType === rule;
   });

  if (!isAccepted) {
   return "Invalid file type. Please choose an allowed file format.";
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
   return `File size must be less than ${maxSizeMB}MB.`;
  }
  return null;
 };

 const handleFile = (file) => {
  if (!file) return;
  setLocalError("");

  const error = validateFile(file);
  if (error) {
   setLocalError(error);
   return;
  }

  if (!multiple) {
   if (file.type?.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
   } else {
    setPreview("compact-file");
   }
   onChange?.(file);
  } else {
   onChange?.([file]);
   setSelectedFiles([]);
  }
 };

 const handleMultipleFiles = (files) => {
  const validFiles = [];
  const errors = [];

  Array.from(files).forEach((file) => {
   const error = validateFile(file);
   if (error) {
    errors.push(`${file.name}: ${error}`);
   } else {
    validFiles.push(file);
   }
  });

  if (errors.length > 0) {
   setLocalError(errors.join(", "));
  }

  if (validFiles.length > 0) {
   onChange?.(validFiles);
   setSelectedFiles([]);
  }
 };

 const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  if (multiple) {
   handleMultipleFiles(e.dataTransfer.files);
  } else {
   handleFile(e.dataTransfer.files[0]);
  }
 };

 const handleRemove = (fileId) => {
  if (multiple) {
   const removedFile = selectedFiles.find((f) => f.id === fileId);
   if (removedFile?.preview) {
    URL.revokeObjectURL(removedFile.preview);
   }
   const newFiles = selectedFiles.filter((f) => f.id !== fileId);
   setSelectedFiles(newFiles);
   onChange?.(newFiles.map((f) => f.file));
   if (newFiles.length === 0 && onRemove) onRemove();
  } else {
   setPreview(null);
   setLocalError("");
   if (inputRef.current) inputRef.current.value = "";
   onRemove?.();
  }
 };

 const triggerFileInput = () => {
  if (inputRef.current) {
   inputRef.current.click();
  }
 };

 const hasFile = multiple ? selectedFiles.length > 0 : !!preview || !!value;
 const isImage =
  !multiple &&
  preview &&
  (preview.startsWith("data:image") ||
   preview.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i) ||
   preview.includes("image/upload"));

 const displayFileName =
  !multiple &&
  (value?.name ||
   existingFileName ||
   preview?.split("/").pop()?.split("?")[0] ||
   "Document uploaded");
 const displayFileSize =
  !multiple &&
  (value?.size
   ? `${(value.size / 1024).toFixed(1)} KB`
   : previewUrl
    ? "Existing file"
    : "");

 return (
  <div className="space-y-1">
   {label && (
    <label className="block text-(--ts) font-semibold text-[13px] mb-2">
     {label} {isRequired && <span className="text-(--danger)">*</span>}
    </label>
   )}

   {/* Compact strip (has file) - Single file mode */}
   {compact && !multiple && hasFile && (
    <div
     className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors
          ${isInvalid ? "border-(--danger)" : "border-(--p)/30 bg-(--pale)"}
        `}
    >
     {isImage ? (
      <img
       src={preview}
       alt="Document preview"
       className="w-10 h-10 rounded-lg object-cover border border-(--bd) shrink-0"
      />
     ) : (
      <div className="w-8 h-8 rounded-lg bg-(--bgs) border border-(--bd) flex items-center justify-center text-(--p) shrink-0">
       <FiFile size={15} />
      </div>
     )}
     <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-(--tp) truncate">
       {displayFileName}
      </p>
      {displayFileSize && (
       <p className="text-xs text-(--tm)">{displayFileSize}</p>
      )}
     </div>
     <div className="flex items-center gap-2 shrink-0">
      <div className="w-5 h-5 rounded-full bg-(--p) flex items-center justify-center text-(--bgs)">
       <FiCheck size={11} />
      </div>
      <Button
       variant="ghost"
       size="sm"
       isRound
       ariaLabel="Remove file"
       onClick={() => handleRemove()}
      >
       <FiX size={11} />
      </Button>
     </div>
    </div>
   )}

   {/* Compact strip (no file) */}
   {compact && (!multiple || selectedFiles.length === 0) && (
    <div
     onDragOver={(e) => {
      e.preventDefault();
      setIsDragging(true);
     }}
     onDragLeave={() => setIsDragging(false)}
     onDrop={handleDrop}
     className={`
           flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all duration-150 ${isDragging ? "border-(--p) bg-(--pale)" : isInvalid ? "border-(--danger) bg-(--bgl) hover:border-(--danger)" : "border-(--bd2) bg-(--bgl) hover:border-(--p) hover:bg-(--pale)"}
          `}
     onClick={triggerFileInput}
    >
     <div
      className={`
            w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${isDragging ? "bg-(--p) text-(--bgs)" : "bg-(--bgm) text-(--p)"}
          `}
     >
      <FiUpload size={15} />
     </div>
     <div>
      <p className="text-sm text-(--tp)">
       Drop file{multiple && "s"} or{" "}
       <span className="text-(--p) font-medium">browse</span>
      </p>
      <p className="text-xs text-(--tm)">
       {helperText || `Accepts ${accept} · Max ${maxSizeMB}MB each`}
      </p>
     </div>
     <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      onChange={(e) => {
       if (multiple) {
        if (e.target.files && e.target.files.length > 0) {
         handleMultipleFiles(e.target.files);
        }
       } else {
        if (e.target.files && e.target.files[0]) {
         handleFile(e.target.files[0]);
        }
       }
       e.target.value = "";
      }}
     />
    </div>
   )}

   {/* Standard tall drop zone - multiple mode */}
   {!compact && multiple && (
    <div
     onDragOver={(e) => {
      e.preventDefault();
      setIsDragging(true);
     }}
     onDragLeave={() => setIsDragging(false)}
     onDrop={handleDrop}
     className={`
            cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200
            ${isDragging ? "border-(--p) bg-(--pale) scale-[1.01]" : "border-(--bd2) bg-(--bgl) hover:border-(--p) hover:bg-(--pale)"}
            ${isInvalid ? "border-(--danger)" : ""}
          `}
     onClick={triggerFileInput}
    >
     <div className="flex flex-col items-center gap-2">
      <div
       className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-(--p) text-(--bgs)" : "bg-(--bgm) text-(--p)"}`}
      >
       <FiUpload size={20} />
      </div>
      <div>
       <p className="text-sm font-medium text-(--tp)">
        Drop files here or <span className="text-(--p)">browse</span>
       </p>
       <p className="text-xs text-(--tm) mt-1">
        {helperText || `Accepts ${accept} • Max ${maxSizeMB}MB each`}
       </p>
      </div>
     </div>
     <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple
      className="hidden"
      onChange={(e) => {
       if (e.target.files && e.target.files.length > 0) {
        handleMultipleFiles(e.target.files);
       }
       e.target.value = "";
      }}
     />
    </div>
   )}

   {/* Standard tall drop zone */}
   {!compact && !multiple && (
    <>
     {preview ? (
      <div
       className={`relative rounded-xl border-2 ${isInvalid ? "border-(--danger)" : "border-(--bd2)"} overflow-hidden bg-(--bgl)`}
      >
       {isImage ? (
        <div>
         <img
          src={preview}
          alt="Preview"
          className="w-full h-48 object-cover"
         />
         <div className="flex items-center justify-between gap-3 p-3 border-t border-(--bd2) bg-(--bgl)">
          <div>
           <p className="text-sm font-medium text-(--tp)">
            {displayFileName}
           </p>
           {displayFileSize && (
            <p className="text-xs text-(--tm)">{displayFileSize}</p>
           )}
          </div>
          <FiCheck className="text-(--p) shrink-0" size={18} />
         </div>
        </div>
       ) : (
        <div className="flex items-center gap-3 p-4">
         <div className="w-10 h-10 rounded-lg bg-(--pale) flex items-center justify-center text-(--p)">
          <FiFile size={20} />
         </div>
         <div>
          <p className="text-sm font-medium text-(--tp)">
           {displayFileName}
          </p>
          <p className="text-xs text-(--tm)">{displayFileSize}</p>
         </div>
         <div className="ml-auto">
          <FiCheck className="text-(--p)" size={18} />
         </div>
        </div>
       )}
       <div className="absolute top-2 right-2">
        <Button
         variant="ghost"
         size="sm"
         isRound
         ariaLabel="Remove file"
         onClick={() => handleRemove()}
         className="bg-(--p4)/50 hover:bg-(--p4)/70 text-(--bgs)"
        >
         <FiX size={14} />
        </Button>
       </div>
      </div>
     ) : (
      <div
       onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
       }}
       onDragLeave={() => setIsDragging(false)}
       onDrop={handleDrop}
       className={`
                cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200
                ${isDragging ? "border-(--p) bg-(--pale) scale-[1.01]" : "border-(--bd2) bg-(--bgl) hover:border-(--p) hover:bg-(--pale)"}
                ${isInvalid ? "border-(--danger)" : ""}
              `}
       onClick={triggerFileInput}
      >
       <div className="flex flex-col items-center gap-2">
        <div
         className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-(--p) text-(--bgs)" : "bg-(--bgm) text-(--p)"}`}
        >
         <FiUpload size={20} />
        </div>
        <div>
         <p className="text-sm font-medium text-(--tp)">
          Drop file here or <span className="text-(--p)">browse</span>
         </p>
         <p className="text-xs text-(--tm) mt-1">
          {helperText || `Accepts ${accept} • Max ${maxSizeMB}MB`}
         </p>
        </div>
       </div>
       <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
         if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
         }
         e.target.value = "";
        }}
       />
      </div>
     )}
    </>
   )}

   {(localError || (isInvalid && errorMessage)) && (
    <p className="text-xs text-(--danger) mt-1">
     {localError || errorMessage}
    </p>
   )}
  </div>
 );
};