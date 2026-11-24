"use client";

import React, { useEffect, useRef, forwardRef, useState } from "react";
import "quill/dist/quill.snow.css";

const TextEditor = forwardRef(
 (
  {
   variant = "outline",
   size = "md",
   isInvalid = false,
   isDisabled = false,
   isBlocked = false,
   isRequired = false,
   placeholder = "Compose your content here...",
   errorMessage,
   helperText,
   label,
   className = "",
   id,
   onChange,
   value = "",
   name,
   ...props
  },
  ref,
 ) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const contentRef = useRef(value || "");
  const containerRef = useRef(null);
  const [isBrowser, setIsBrowser] = useState(false);
  const debounceTimerRef = useRef(null);

  const editorId =
   id || `editor-${Math.random().toString(36).substring(2, 9)}`;

  const maxHeights = {
   sm: "150px",
   md: "250px",
   lg: "350px",
  };

  const sizeClasses = {
   sm: "min-h-[150px] max-h-[250px] h-full",
   md: "min-h-[250px] max-h-[350px] h-full",
   lg: "min-h-[350px] max-h-[450px] h-full",
  };

  const variantClasses = {
   outline: "border border-(--bd2) rounded-md",
   filled: "bg-(--bgm) border-2 border-transparent rounded-md",
   flushed: "border-b-2 border-(--bd2) rounded-none",
  };

  const stateClasses = {
   invalid: "border-(--danger)",
   disabled: "opacity-60 cursor-not-allowed bg-(--bgm)",
   blocked: "opacity-70 cursor-not-allowed bg-(--bgl) pointer-events-none",
  };

  const labelClasses = {
   base: "block text-(--ts) mb-1",
   sm: "text-xs",
   md: "text-sm",
   lg: "text-base",
   disabled: "opacity-60",
   blocked: "opacity-70",
   invalid: "text-(--danger)",
  };

  const helperTextClasses = "mt-1 text-xs text-(--tm)";
  const errorMessageClasses = "mt-1 text-xs text-(--danger)";

  const labelClassNames = [
   labelClasses.base,
   labelClasses[size],
   isDisabled ? labelClasses.disabled : "",
   isBlocked ? labelClasses.blocked : "",
   isInvalid ? labelClasses.invalid : "",
  ].join(" ");

  const editorClassNames = [
   variantClasses[variant],
   isInvalid ? stateClasses.invalid : "",
   isDisabled ? stateClasses.disabled : "",
   isBlocked ? stateClasses.blocked : "",
   sizeClasses[size],
   className,
  ].join(" ");

  useEffect(() => {
   setIsBrowser(typeof window !== "undefined");
  }, []);

  useEffect(() => {
   if (!isBrowser) return;

   // Dynamically import Quill only on client-side
   const initQuill = async () => {
    try {
     // Import Quill dynamically
     const QuillLib = await import("quill");
     const Quill = QuillLib.default;

     if (quillRef.current) {
      quillRef.current.off("text-change");
      quillRef.current = null;
     }

     if (
      containerRef.current &&
      containerRef.current.querySelector(".ql-toolbar")
     ) {
      containerRef.current.querySelector(".ql-toolbar").remove();
     }

     if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
       modules: {
        toolbar: [
         [{ font: [] }],
         [{ header: [1, 2, 3, 4, 5, 6, false] }],
         [{ size: ["small", false, "large", "huge"] }],
         ["bold", "italic", "underline", "strike"],
         [{ color: [] }, { background: [] }],
         [{ script: "sub" }, { script: "super" }],
         [{ list: "ordered" }, { list: "bullet" }],
         [{ indent: "-1" }, { indent: "+1" }],
         [{ direction: "rtl" }, { align: [] }],
         ["blockquote", "code-block"],
         ["link", "image", "video"],
         ["clean"],
        ],
       },
       placeholder: placeholder,
       theme: "snow",
       readOnly: isDisabled || isBlocked,
      });

      if (value) {
       quillRef.current.root.innerHTML = value;
      }

      const handler = () => {
       if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
       }

       debounceTimerRef.current = setTimeout(() => {
        const content = quillRef.current?.root?.innerHTML || "";
        contentRef.current = content;

        if (
         onChange &&
         content !== value &&
         !(isDisabled || isBlocked)
        ) {
         const syntheticEvent = {
          target: {
           name: name,
           value: content,
          },
         };
         onChange(syntheticEvent);
        }
       }, 10000); // 10 seconds debounce
      };

      quillRef.current.on("text-change", handler);

      if (editorRef.current) {
       editorRef.current.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
         e.stopPropagation();
        }
       });
      }
     }
    } catch (error) {
     console.error("Error initializing Quill:", error);
    }
   };

   initQuill();

   return () => {
    if (debounceTimerRef.current) {
     clearTimeout(debounceTimerRef.current);
    }
    if (quillRef.current) {
     quillRef.current.off("text-change");
     quillRef.current = null;
    }
    if (editorRef.current) {
     editorRef.current.removeEventListener("keydown", () => {});
    }
   };
  }, [isDisabled, isBlocked, name, onChange, placeholder, isBrowser]);

  useEffect(() => {
   if (
    isBrowser &&
    quillRef.current &&
    value !== undefined &&
    value !== contentRef.current
   ) {
    const currentContent = quillRef.current.root.innerHTML;
    if (currentContent !== value) {
     contentRef.current = value;
     quillRef.current.root.innerHTML = value;
    }
   }
  }, [value, isBrowser]);

  return (
   <div className="w-full">
    {label && (
     <label htmlFor={editorId} className={labelClassNames}>
      {label}
      {isRequired && <span className="text-(--danger) ml-1">*</span>}
     </label>
    )}

    <div
     ref={containerRef}
     className={editorClassNames}
     aria-invalid={isInvalid}
     aria-describedby={
      helperText
       ? `${editorId}-helper-text`
       : errorMessage && isInvalid
        ? `${editorId}-error-message`
        : undefined
     }
    >
     <div
      ref={editorRef}
      className={["[height:var(--inline-height)]"].filter(Boolean).join(" ")} style={{ "--inline-height": maxHeights[size] }}
      id={editorId}
     />
    </div>

    <input
     ref={ref}
     type="hidden"
     name={name}
     value={contentRef.current}
     disabled={isDisabled || isBlocked}
     required={isRequired}
     {...props}
    />

    {helperText && !isInvalid && (
     <div id={`${editorId}-helper-text`} className={helperTextClasses}>
      {helperText}
     </div>
    )}

    {isInvalid && errorMessage && (
     <div id={`${editorId}-error-message`} className={errorMessageClasses}>
      {errorMessage}
     </div>
    )}
   </div>
  );
 },
);

TextEditor.displayName = "TextEditor";

export default TextEditor;
