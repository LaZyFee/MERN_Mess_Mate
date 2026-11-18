"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import Toast from "./Toast";

// Create context
const ToastContext = createContext({
  showToast: () => {},
  hideToast: () => {},
  hideAllToasts: () => {},
  confirm: () => {},
  prompt: () => {},
  fire: () => {},
  loading: () => {},
  update: () => {},
  queue: () => {},
});

/**
 * Hook to use toast functionality
 * @returns {Object} Toast functions (showToast, hideToast, hideAllToasts, confirm, prompt, fire, loading, update, queue)
 */
export const useToast = () => useContext(ToastContext);

/**
 * ToastProvider component for managing toast notifications
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right'} [props.position='bottom-right'] - Default position for toasts
 * @param {number} [props.maxToasts=10] - Maximum number of toasts to display at once
 * @param {Object} [props.defaultConfig={}] - Default configuration for all toasts
 */
export const ToastProvider = ({
  children,
  position = "bottom-right",
  maxToasts = 10,
  defaultConfig = {},
}) => {
  const [toasts, setToasts] = useState([]);
  const toastQueue = useRef([]);
  const toastCount = useRef(0);

  // Process the queue when toasts change
  const processQueue = useCallback(() => {
    if (toastQueue.current.length > 0 && toasts.length < maxToasts) {
      const nextToast = toastQueue.current.shift();
      setToasts((prevToasts) => [...prevToasts, nextToast]);
    }
  }, [toasts, maxToasts]);

  /**
   * Generate a unique ID for a toast
   * @returns {string} Unique toast ID
   */
  const generateId = () => {
    toastCount.current += 1;
    return `toast-${Date.now()}-${toastCount.current}`;
  };

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   * @param {string} options.title - Toast title
   * @param {string} [options.description] - Toast description
   * @param {'info'|'success'|'warning'|'error'|'question'|'loading'} [options.status='info'] - Toast status
   * @param {number} [options.duration=5000] - Duration in ms (0 for no auto-hide)
   * @param {string} [options.position] - Override default position
   * @param {boolean} [options.showProgressBar] - Whether to show a progress bar
   * @param {string} [options.animation] - Animation style
   * @param {React.ReactNode} [options.icon] - Custom icon
   * @param {boolean} [options.hasCloseButton=true] - Whether to show close button
   * @param {string} [options.className] - Additional classes
   * @param {string} [options.id] - Custom ID (if not provided, one will be generated)
   * @returns {string} Toast ID
   */
  const showToast = useCallback(
    ({
      title,
      description,
      status = "info",
      duration = 5000,
      position: toastPosition,
      showProgressBar = false,
      animation,
      icon,
      hasCloseButton = true,
      className = "",
      id: customId,
      ...rest
    }) => {
      const id = customId || generateId();

      const newToast = {
        id,
        title,
        description,
        status,
        duration,
        position: toastPosition || position,
        type: "toast",
        showProgressBar,
        animation,
        icon,
        hasCloseButton,
        className,
        ...defaultConfig,
        ...rest,
      };

      if (toasts.length < maxToasts) {
        setToasts((prevToasts) => [...prevToasts, newToast]);
      } else {
        toastQueue.current.push(newToast);
      }

      return id;
    },
    [toasts.length, position, defaultConfig, maxToasts],
  );

  // Hide a specific toast by ID
  const hideToast = useCallback(
    (id) => {
      setToasts((prevToasts) => {
        const newToasts = prevToasts.filter((toast) => toast.id !== id);
        // Process queue on next tick if we removed a toast
        if (newToasts.length < prevToasts.length) {
          setTimeout(processQueue, 0);
        }
        return newToasts;
      });
    },
    [processQueue],
  );

  // Hide all toasts
  const hideAllToasts = useCallback(() => {
    setToasts([]);
    toastQueue.current = [];
  }, []);

  /**
   * Update an existing toast
   * @param {string} id - ID of toast to update
   * @param {Object} options - New toast options
   */
  const updateToast = useCallback((id, options) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, ...options } : toast,
      ),
    );
  }, []);

  /**
   * Show a loading toast that can be updated later
   * @param {Object} options - Toast options
   * @param {string} options.title - Toast title
   * @param {string} [options.description] - Toast description
   * @returns {Object} - Toast control object with update and close methods
   */
  const loading = useCallback(
    (options) => {
      const id = showToast({
        ...options,
        status: "loading",
        duration: 0, // Don't auto-hide loading toasts
        hasCloseButton: false,
      });

      return {
        id,
        update: (updateOptions) => updateToast(id, updateOptions),
        close: () => hideToast(id),
      };
    },
    [showToast, updateToast, hideToast],
  );

  /**
   * Display a confirmation dialog
   * @param {Object} options - Confirmation options
   * @param {string} options.title - Dialog title
   * @param {string} [options.text] - Dialog text
   * @param {'info'|'success'|'warning'|'error'|'question'} [options.icon='question'] - Dialog icon
   * @param {boolean} [options.showCancelButton=true] - Show cancel button
   * @param {string} [options.confirmButtonText='OK'] - Confirm button text
   * @param {string} [options.cancelButtonText='Cancel'] - Cancel button text
   * @param {string} [options.position='center'] - Dialog position
   * @param {string} [options.width] - Dialog width
   * @param {boolean} [options.dismissOnEscape=true] - Whether to dismiss on escape key
   * @param {boolean} [options.dismissOnClickOutside=true] - Whether to dismiss when clicking outside
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
   */
  const confirm = useCallback(
    ({
      title,
      text,
      icon = "question",
      showCancelButton = true,
      confirmButtonText = "OK",
      cancelButtonText = "Cancel",
      position: dialogPosition = "center",
      width,
      dismissOnEscape = true,
      dismissOnClickOutside = true,
      ...rest
    }) => {
      return new Promise((resolve) => {
        const id = generateId();

        const userOnConfirm = rest?.onConfirm;
        const userOnCancel = rest?.onCancel;

        setToasts((prevToasts) => [
          ...prevToasts,
          {
            id,
            title,
            description: text,
            status: icon,
            duration: 0, // Don't auto-hide
            position: dialogPosition,
            type: "confirm",
            showCancelButton,
            confirmButtonText,
            cancelButtonText,
            width,
            dismissOnEscape,
            dismissOnClickOutside,
            ...defaultConfig,
            ...rest,
            onConfirm: () => {
              if (userOnConfirm) userOnConfirm();
              hideToast(id);
              resolve(true);
            },
            onCancel: () => {
              if (userOnCancel) userOnCancel();
              hideToast(id);
              resolve(false);
            },
          },
        ]);
      });
    },
    [defaultConfig],
  );

  /**
   * Display a prompt dialog
   * @param {Object} options - Prompt options
   * @param {string} options.title - Dialog title
   * @param {string} [options.text] - Dialog text
   * @param {string} [options.defaultValue=''] - Default input value
   * @param {'info'|'success'|'warning'|'error'|'question'} [options.icon='question'] - Dialog icon
   * @param {string} [options.inputPlaceholder=''] - Input placeholder text
   * @param {string} [options.inputLabel=''] - Input label text
   * @param {'text'|'password'|'email'|'number'|'tel'|'url'} [options.inputType='text'] - Input type
   * @param {Function} [options.validateInput] - Function to validate input
   * @param {string} [options.position='center'] - Dialog position
   * @param {string} [options.width] - Dialog width
   * @returns {Promise<string|null>} - Resolves to input value or null if canceled
   */
  const prompt = useCallback(
    ({
      title,
      text,
      defaultValue = "",
      icon = "question",
      inputPlaceholder = "",
      inputLabel = "",
      inputType = "text",
      validateInput,
      position: dialogPosition = "center",
      width,
      ...rest
    }) => {
      return new Promise((resolve) => {
        const id = generateId();

        setToasts((prevToasts) => [
          ...prevToasts,
          {
            id,
            title,
            description: text,
            status: icon,
            duration: 0, // Don't auto-hide
            position: dialogPosition,
            type: "prompt",
            defaultValue,
            inputPlaceholder,
            inputLabel,
            inputType,
            validateInput,
            width,
            ...defaultConfig,
            ...rest,
            onSubmit: (value) => {
              hideToast(id);
              resolve(value);
            },
            onCancel: () => {
              hideToast(id);
              resolve(null);
            },
          },
        ]);
      });
    },
    [defaultConfig],
  );

  /**
   * SweetAlert-like fire method for all alert types
   * @param {Object} options - Alert options
   * @returns {Promise} - Resolves when alert is closed
   */
  const fire = useCallback(
    (options) => {
      // If options has 'input' property, it's a prompt
      if (options.input) {
        return prompt({
          title: options.title,
          text: options.text,
          defaultValue: options.inputValue || "",
          icon: options.icon || "question",
          inputPlaceholder: options.inputPlaceholder,
          inputLabel: options.inputLabel,
          inputType: options.inputType || "text",
          validateInput: options.inputValidator,
        });
      }
      // If options has showCancelButton, it's a confirm
      else if (options.showCancelButton) {
        return confirm({
          title: options.title,
          text: options.text,
          icon: options.icon || "question",
          confirmButtonText: options.confirmButtonText,
          cancelButtonText: options.cancelButtonText,
          position: options.position || "center",
          width: options.width,
        });
      }
      // Otherwise it's a regular toast
      else {
        const id = showToast({
          title: options.title,
          description: options.text,
          status: options.icon || "info",
          duration: options.timer || 5000,
          position: options.position,
          showProgressBar: options.showProgressBar,
          animation: options.animation,
        });

        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!toasts.some((toast) => toast.id === id)) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
    },
    [showToast, confirm, prompt, toasts],
  );

  /**
   * Queue multiple toasts to be shown sequentially
   * @param {Array} toastsToQueue - Array of toast options
   * @returns {Promise} - Resolves when all toasts have been shown
   */
  const queueToasts = useCallback(
    async (toastsToQueue) => {
      const results = [];
      for (const toastOptions of toastsToQueue) {
        const result = await fire(toastOptions);
        results.push(result);
      }
      return results;
    },
    [fire],
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
        hideAllToasts,
        confirm,
        prompt,
        fire,
        loading,
        update: updateToast,
        queue: queueToasts,
      }}
    >
      {children}

      {/* Render all active toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          isVisible={true}
          status={toast.status}
          title={toast.title}
          description={toast.description}
          duration={toast.duration}
          position={toast.position}
          onClose={() => hideToast(toast.id)}
          type={toast.type}
          showCancelButton={toast.showCancelButton}
          confirmButtonText={toast.confirmButtonText}
          cancelButtonText={toast.cancelButtonText}
          onConfirm={toast.onConfirm}
          onCancel={toast.onCancel}
          defaultValue={toast.defaultValue}
          onSubmit={toast.onSubmit}
          inputPlaceholder={toast.inputPlaceholder}
          inputLabel={toast.inputLabel}
          inputType={toast.inputType}
          validateInput={toast.validateInput}
          dismissOnEscape={toast.dismissOnEscape}
          dismissOnClickOutside={toast.dismissOnClickOutside}
          showProgressBar={toast.showProgressBar}
          icon={toast.icon}
          width={toast.width}
          animation={toast.animation}
          className={toast.className}
        />
      ))}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
