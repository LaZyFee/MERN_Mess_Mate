import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FiSearch,
  FiX,
  FiRefreshCw,
  FiDownload,
  FiEye,
  FiChevronDown,
  FiChevronUp,
  FiInbox,
  FiAlertCircle,
  FiFileText,
  FiFile,
} from "react-icons/fi";
import Button from "@/components/shared/buttons/Button";
import PaginationComponent from "@/components/shared/navigation/Pagination";
import Input from "@/components/shared/forms/Input";
import Select from "@/components/shared/forms/Select";
import Checkbox from "@/components/shared/forms/Checkbox";
import DateTimePicker from "@/components/shared/ui/DateTimePicker";
import { parseRecordListResponse } from "@/lib/api/safeData";

const REFRESH_EVENT = "dashboard:refresh";
const REFRESH_START_EVENT = "dashboard:refresh:start";
const REFRESH_END_EVENT = "dashboard:refresh:end";

const getPaginationInfo = (response, defaultParams = {}) => {
  if (!response || typeof response !== "object") {
    return {
      page: defaultParams.page ?? 1,
      limit: defaultParams.limit ?? 10,
      totalItems: 0,
      totalPages: 1,
      sortBy: "",
      sortOrder: "",
    };
  }

  if (response?.pagination) {
    const page = Number(response.pagination.page ?? 1);
    const limit = Number(response.pagination.limit ?? 10);
    const totalItems = Number(
      response.pagination.totalItems ?? response.pagination.total ?? 0,
    );
    const totalPages =
      Math.ceil(totalItems / (limit || 1)) ||
      Number(response.pagination.totalPages ?? 1);
    return {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      totalItems: isNaN(totalItems) ? 0 : totalItems,
      totalPages: isNaN(totalPages) ? 1 : totalPages,
      sortBy: response.pagination.sortBy ?? "",
      sortOrder: response.pagination.sortOrder ?? "",
    };
  }

  let dataArray = [];
  if (Array.isArray(response)) {
    dataArray = response;
  } else if (Array.isArray(response?.data)) {
    dataArray = response.data;
  } else if (Array.isArray(response?.data?.data)) {
    dataArray = response.data.data;
  } else if (response?.data && typeof response.data === "object") {
    const arrayKey = Object.keys(response.data).find((key) =>
      Array.isArray(response.data[key]),
    );
    if (arrayKey) {
      dataArray = response.data[arrayKey];
    }
  } else if (response && typeof response === "object") {
    const arrayKey = Object.keys(response).find((key) =>
      Array.isArray(response[key]),
    );
    if (arrayKey) {
      dataArray = response[arrayKey];
    }
  }

  const totalItems = Number(
    response?.pagination?.totalItems ??
    response?.pagination?.total ??
    response?.totalItems ??
    response?.total ??
    response?.data?.totalItems ??
    response?.data?.total ??
    response?.data?.pagination?.totalItems ??
    response?.data?.pagination?.total ??
    response?.count ??
    response?.data?.count ??
    dataArray.length,
  );
  const limit = Number(
    response?.pagination?.limit ??
    response?.limit ??
    response?.data?.limit ??
    response?.data?.pagination?.limit ??
    defaultParams.limit ??
    10,
  );
  const page = Number(
    response?.pagination?.page ??
    response?.page ??
    response?.data?.page ??
    response?.data?.pagination?.page ??
    defaultParams.page ??
    1,
  );
  const totalPages =
    Math.ceil(totalItems / (limit || 1)) ||
    Number(
      response?.pagination?.totalPages ??
      response?.totalPages ??
      response?.data?.totalPages ??
      response?.data?.pagination?.totalPages ??
      1,
    );

  return {
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 10 : limit,
    totalItems: isNaN(totalItems) ? 0 : totalItems,
    totalPages: isNaN(totalPages) ? 1 : totalPages,
    sortBy:
      response?.pagination?.sortBy ??
      response?.sortBy ??
      response?.data?.sortBy ??
      "",
    sortOrder:
      response?.pagination?.sortOrder ??
      response?.sortOrder ??
      response?.data?.sortOrder ??
      "",
  };
};

// SearchInput Component
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  disabled,
}) {
  return (
    <div className="relative flex-1 min-w-50 max-w-sm">
      <FiSearch
        className="absolute left-3 top-1/2 -translate-y-1/2 text-(--tm)"
        size={13}
      />
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs bg-(--bg) border border-(--bd) text-(--tp) placeholder:text-(--tl) focus:outline-none focus:border-(--p) transition-colors"
      />
    </div>
  );
}

// FilterBar Component
export function FilterBar({
  filters = [],
  activeParams = {},
  onFilterChange,
  disabled,
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((f) => (
        <select
          key={f.id}
          disabled={disabled}
          value={activeParams[f.id] || ""}
          onChange={(e) => onFilterChange(f.id, e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-(--bg) border border-(--bd) text-(--tp) focus:outline-none focus:border-(--p) cursor-pointer"
        >
          <option value="">All {f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

// EmptyState Component
export function EmptyState({
  icon: Icon = FiInbox,
  title = "No data available",
  description = "There are no records to display.",
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-(--bgm) flex items-center justify-center text-(--tm) mb-3 border border-(--bd)">
        <Icon size={20} />
      </div>
      <h3 className="text-xs font-semibold text-(--tp)">{title}</h3>
      <p className="text-[11px] text-(--tm) mt-1 max-w-xs">{description}</p>
    </div>
  );
}

// ErrorState Component
export function ErrorState({ message = "Failed to load data", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-3 border border-rose-500/20">
        <FiAlertCircle size={20} />
      </div>
      <h3 className="text-xs font-semibold text-(--tp)">An Error Occurred</h3>
      <p className="text-[11px] text-(--tm) mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="secondary"
          size="sm"
          className="mt-3"
          leftIcon={<FiRefreshCw size={12} />}
        >
          Retry
        </Button>
      )}
    </div>
  );
}

// LoadingSkeleton Component
export function LoadingSkeleton({ columnsCount = 5, rowsCount = 5 }) {
  return (
    <tbody className="divide-y divide-(--bd)">
      {Array.from({ length: rowsCount }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          {Array.from({ length: columnsCount }).map((_, cIdx) => (
            <td key={cIdx} className="px-4 py-3">
              <div className="h-3.5 bg-(--bgm) rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export const Pagination = PaginationComponent;

// Main Reusable DataTable Component
export const DataTable = forwardRef(function DataTable(
  {
    fetchData,
    columns = [],
    filters = [],
    defaultParams = { page: 1, limit: 20 },
    initialData = null,
    initialPagination = null,
    onRowClick,
    rowClassName,
    className = "",
    searchPlaceholder = "Search...",
    showExport = true,
    dataFilter = true,
    showColumnVisibility = false,
    onDataLoaded,

    // Layout customization
    showToolbar = true,
    showPagination = true,
    refreshKey = 0,
    toolbarChildren,

    // Controlled Overrides
    data: dataProp,
    pagination: paginationProp,
    loading: loadingProp,
    error: errorProp,
    onParamsChange,
    activeFilters: activeFiltersProp,
    currentPage,
    page,
    totalPages,
    total,
    totalItems,
    limit,
    itemsPerPage,
    onPageChange,
    onLimitChange,

    // Add onRefresh prop
    onRefresh,
  },
  ref,
) {
  const isControlled = dataProp !== undefined;

  // Internal States
  const extractInitialData = (init) => {
    if (init !== null && init !== undefined) {
      if (Array.isArray(init)) return init;
      if (Array.isArray(init?.data)) return init.data;
      if (Array.isArray(init?.data?.data)) return init.data.data;
      if (Array.isArray(init?.data?.bookings)) return init.data.bookings;
      if (Array.isArray(init?.data?.items)) return init.data.items;
      if (Array.isArray(init?.bookings)) return init.bookings;
      if (Array.isArray(init?.items)) return init.items;
      if (init?.data && typeof init.data === "object") {
        const key = Object.keys(init.data).find((k) =>
          Array.isArray(init.data[k]),
        );
        if (key) return init.data[key];
      }
      if (typeof init === "object") {
        const key = Object.keys(init).find((k) =>
          Array.isArray(init[k]),
        );
        if (key) return init[key];
      }
    }
    return [];
  };

  const [data, setData] = useState(() => extractInitialData(initialData));

  useEffect(() => {
    if (!isControlled && !fetchDataRef.current) {
      setData(extractInitialData(initialData));
    }
  }, [initialData, isControlled]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    if (initialData === null || initialData === undefined) return null;
    const parsed = parseRecordListResponse(initialData);
    return parsed.ok ? null : parsed.error;
  });
  const resolvedDefaultLimit = Number(
    defaultParams.limit ?? itemsPerPage ?? limit ?? 20,
  );
  const [pagination, setPagination] = useState(() => {
    if (initialPagination) {
      const pageNum = Number(
        initialPagination.page ??
        initialPagination.currentPage ??
        defaultParams.page ??
        1,
      );
      const limitNum = Number(
        initialPagination.limit ?? resolvedDefaultLimit,
      );
      const totalNum = Number(
        initialPagination.totalItems ?? initialPagination.total ?? 0,
      );
      return {
        page: pageNum,
        limit: limitNum,
        totalItems: totalNum,
        totalPages:
          initialPagination.totalPages ??
          (Math.ceil(totalNum / (limitNum || 1)) || 1),
        sortBy: initialPagination.sortBy ?? "",
        sortOrder: initialPagination.sortOrder ?? "",
      };
    }
    if (
      initialData &&
      typeof initialData === "object" &&
      !Array.isArray(initialData)
    ) {
      return getPaginationInfo(initialData, {
        ...defaultParams,
        limit: resolvedDefaultLimit,
      });
    }
    const initialCount = Array.isArray(initialData)
      ? initialData.length
      : Array.isArray(initialData?.data)
        ? initialData.data.length
        : 0;
    return {
      page: defaultParams.page ?? 1,
      limit: resolvedDefaultLimit,
      totalItems: initialCount,
      totalPages: Math.ceil(initialCount / (resolvedDefaultLimit || 20)) || 1,
      sortBy: "",
      sortOrder: "",
    };
  });

  const [params, setParams] = useState({
    page: defaultParams.page ?? 1,
    limit: resolvedDefaultLimit,
    search: defaultParams.search ?? "",
    sortBy: "",
    sortOrder: "",
    from_date: defaultParams.from_date ?? "",
    to_date: defaultParams.to_date ?? "",
    ...defaultParams.filters,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(
    defaultParams.search ?? "",
  );
  const currentFetchPromise = useRef(null);
  const lastFetchParamsRef = useRef(null);
  const fetchDataRef = useRef(fetchData);

  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Debounce search parameter changes
  useEffect(() => {
    if (isControlled && onParamsChange) return;
    if (debouncedSearch === params.search) return;

    const handler = setTimeout(() => {
      setParams((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
    }, 1500);
    return () => clearTimeout(handler);
  }, [debouncedSearch, isControlled, onParamsChange, params.search]);

  // Fetch call
  const loadData = useCallback(
    async (currentParams) => {
      if (isControlled || !fetchDataRef.current) return;

      setLoading(true);
      setError(null);

      const dedupKey = JSON.stringify({
        ...currentParams,
        _refresh: refreshKey,
      });

      if (
        lastFetchParamsRef.current === dedupKey &&
        currentFetchPromise.current
      ) {
        return await currentFetchPromise.current;
      }

      lastFetchParamsRef.current = dedupKey;
      currentFetchPromise.current = (async () => {
        const response = await fetchDataRef.current(currentParams);
        const parsed = parseRecordListResponse(response);
        if (!parsed.ok) throw new Error(parsed.error);
        const rows = parsed.data;

        setData(rows);
        const pagInfo = getPaginationInfo(response, currentParams);
        setPagination(pagInfo);

        if (onDataLoaded) {
          onDataLoaded(rows, response);
        }
      })();

      try {
        await currentFetchPromise.current;
      } catch (err) {
        console.error("DataTable fetch error:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
        currentFetchPromise.current = null;
      }
    },
    [isControlled, refreshKey, onDataLoaded],
  );

  const clientFilteredData = useMemo(() => {
    if (isControlled || fetchData) return [];
    const sourceData = Array.isArray(data) ? data : [];
    if (!sourceData.length) return [];

    let result = [...sourceData];

    const searchVal = (params.search || "").trim().toLowerCase();
    if (searchVal) {
      result = result.filter((row) => {
        if (!row) return false;
        return columns.some((col) => {
          let val = "";
          try {
            if (col.accessor) {
              val =
                typeof col.accessor === "function"
                  ? col.accessor(row)
                  : row[col.accessor];
            } else if (col.id) {
              val = row[col.id];
            }
          } catch {
            val = "";
          }
          return String(val ?? "")
            .toLowerCase()
            .includes(searchVal);
        });
      });
    }

    Object.entries(params).forEach(([key, val]) => {
      if (
        val !== "" &&
        val !== undefined &&
        val !== null &&
        !["page", "limit", "search", "sortBy", "sortOrder"].includes(key)
      ) {
        if (key === "from_date") {
          result = result.filter((row) => {
            if (!row) return false;
            const dateVal = row.created_at || row.date || row.updated_at;
            if (!dateVal) return true;
            return new Date(dateVal) >= new Date(val);
          });
        } else if (key === "to_date") {
          result = result.filter((row) => {
            if (!row) return false;
            const dateVal = row.created_at || row.date || row.updated_at;
            if (!dateVal) return true;
            const toDate = new Date(val);
            toDate.setHours(23, 59, 59, 999);
            return new Date(dateVal) <= toDate;
          });
        } else {
          result = result.filter(
            (row) => row && String(row[key] ?? "") === String(val),
          );
        }
      }
    });

    return result;

  }, [
    isControlled,
    fetchData,
    data,
    params.search,
    params,
    columns,
  ]);

  const clientSortedData = useMemo(() => {
    if (isControlled || fetchData) return [];
    if (!params.sortBy) return clientFilteredData;

    const col = columns.find((c) => c.id === params.sortBy);
    const isDesc = params.sortOrder === "desc";

    return [...clientFilteredData].sort((a, b) => {
      let valA = "";
      let valB = "";
      try {
        valA = col?.accessor
          ? typeof col.accessor === "function"
            ? col.accessor(a)
            : a?.[col.accessor]
          : a?.[params.sortBy];
      } catch {
        valA = "";
      }
      try {
        valB = col?.accessor
          ? typeof col.accessor === "function"
            ? col.accessor(b)
            : b?.[col.accessor]
          : b?.[params.sortBy];
      } catch {
        valB = "";
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }, [
    clientFilteredData,
    params.sortBy,
    params.sortOrder,
    columns,
    isControlled,
    fetchData,
  ]);

  const clientPaginatedData = useMemo(() => {
    if (isControlled || fetchData) return [];
    const startIndex = (params.page - 1) * params.limit;
    return clientSortedData.slice(startIndex, startIndex + params.limit);
  }, [clientSortedData, params.page, params.limit, isControlled, fetchData]);

  // Active state and selectors - MOVED BEFORE useImperativeHandle
  const controlledDataResult = isControlled
    ? parseRecordListResponse(dataProp)
    : null;
  const controlledDataIsValid = controlledDataResult?.ok;
  const rawActiveData = isControlled
    ? controlledDataIsValid
      ? controlledDataResult.data
      : []
    : fetchData
      ? data
      : clientPaginatedData;
  const activeData = rawActiveData;
  const activeLoading = isControlled ? loadingProp : loading;
  const controlledDataError = controlledDataResult?.error;
  const activeError = isControlled
    ? errorProp || (!activeLoading && !controlledDataIsValid
      ? controlledDataError
      : null)
    : error;
  const activeParams = useMemo(() => {
    return isControlled ? activeFiltersProp || {} : params;
  }, [isControlled, activeFiltersProp, params]);

  const activePagination = useMemo(() => {
    if (isControlled) {
      if (paginationProp) return paginationProp;

      const resolvedPage = page ?? currentPage;
      const resolvedLimit = limit ?? itemsPerPage;
      const resolvedTotalItems = totalItems ?? total;

      if (
        resolvedPage !== undefined ||
        resolvedLimit !== undefined ||
        resolvedTotalItems !== undefined ||
        totalPages !== undefined
      ) {
        return {
          page: Number(resolvedPage ?? 1),
          limit: Number(resolvedLimit ?? 10),
          totalItems: Number(resolvedTotalItems ?? 0),
          totalPages: Number(totalPages ?? 1),
          sortBy: activeFiltersProp?.sortBy ?? "",
          sortOrder: activeFiltersProp?.sortOrder ?? "",
        };
      }
      return null;
    }
    if (fetchData) return pagination;

    const totalItemsVal = clientSortedData.length;
    const totalPagesVal = Math.ceil(totalItemsVal / params.limit) || 1;
    return {
      page: params.page,
      limit: params.limit,
      totalItems: totalItemsVal,
      totalPages: totalPagesVal,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };
  }, [
    isControlled,
    fetchData,
    paginationProp,
    pagination,
    clientSortedData.length,
    params.page,
    params.limit,
    params.sortBy,
    params.sortOrder,
    page,
    currentPage,
    limit,
    itemsPerPage,
    totalItems,
    total,
    totalPages,
    activeFiltersProp,
  ]);

  // Expose methods to parent component - MOVED AFTER activeParams is defined
  useImperativeHandle(
    ref,
    () => ({
      refresh: () => {
        if (isControlled) {
          if (onParamsChange) onParamsChange({ ...activeParams });
        } else if (fetchData) {
          loadData(params);
        }
      },
      getData: () => data,
      getParams: () => params,
      getPagination: () => pagination,
    }),
    [
      isControlled,
      fetchData,
      loadData,
      params,
      pagination,
      onParamsChange,
      activeParams,
      data,
    ],
  );

  const hasInitialData = initialData !== null && initialData !== undefined;
  const isInitialMount = useRef(hasInitialData);

  // Load data when parameters change or on refresh
  useEffect(() => {
    if (isControlled || !fetchDataRef.current) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData(params);

  }, [
    isControlled,
    refreshKey,
    params.page,
    params.limit,
    params.search,
    params.sortBy,
    params.sortOrder,
    params._t,
    params.from_date,
    params.to_date,
    params,
  ]);

  const handlePageChange = (newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else if (isControlled) {
      if (onParamsChange) onParamsChange({ ...activeParams, page: newPage });
    } else {
      setParams((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleLimitChange = (newLimit) => {
    if (onLimitChange) {
      onLimitChange(newLimit);
    } else if (isControlled) {
      if (onParamsChange)
        onParamsChange({ ...activeParams, limit: newLimit, page: 1 });
    } else {
      setParams((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    }
  };

  const handleSort = (columnId) => {
    if (isControlled) {
      if (onParamsChange) {
        const isDesc =
          activeParams.sortBy === columnId && activeParams.sortOrder === "desc";
        onParamsChange({
          ...activeParams,
          sortBy: columnId,
          sortOrder:
            activeParams.sortBy === columnId
              ? isDesc
                ? "asc"
                : "desc"
              : "asc",
          page: 1,
        });
      }
    } else {
      setParams((prev) => {
        const isDesc = prev.sortBy === columnId && prev.sortOrder === "desc";
        return {
          ...prev,
          sortBy: columnId,
          sortOrder:
            prev.sortBy === columnId ? (isDesc ? "asc" : "desc") : "asc",
          page: 1,
        };
      });
    }
  };

  const handleFilterChange = (filterId, val) => {
    if (isControlled) {
      if (onParamsChange)
        onParamsChange({ ...activeParams, [filterId]: val, page: 1 });
    } else {
      setParams((prev) => ({
        ...prev,
        [filterId]: val,
        page: 1,
      }));
    }
  };

  const handleResetFilters = () => {
    if (isControlled) {
      if (onParamsChange) {
        const cleared = { page: 1, limit: activeParams.limit, search: "" };
        onParamsChange(cleared);
      }
    } else {
      setDebouncedSearch("");
      setParams({
        page: 1,
        limit: params.limit,
        search: "",
        sortBy: "",
        sortOrder: "",
        from_date: "",
        to_date: "",
      });
    }
  };

  const handleRefresh = () => {
    if (isControlled) {
      if (onParamsChange) onParamsChange({ ...activeParams });
    } else if (fetchData) {
      loadData(params);
    }
  };

  // Helper to safely access nested properties via dot notation (e.g. "user.email", "vendor.name")
  const getNestedValue = (obj, path) => {
    if (!obj || !path || typeof path !== "string") return undefined;
    if (!path.includes(".")) return obj[path];
    return path
      .split(".")
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  };

  // Helper to extract clean text content from React elements, badges, spans, and icons
  const getElementText = (element) => {
    if (!element && element !== 0) return "";
    if (typeof element === "string" || typeof element === "number") return String(element);
    if (typeof element === "boolean") return element ? "Active" : "Inactive";
    if (Array.isArray(element)) return element.map(getElementText).filter(Boolean).join(" ");

    if (React.isValidElement(element)) {
      const props = element.props || {};

      // If StatusBadge or BooleanBadge with status / value prop
      if (props.status !== undefined) {
        if (typeof props.status === "boolean") return props.status ? "Active" : "Inactive";
        if (typeof props.status === "string") {
          const configLabel = props.config?.[props.status]?.label;
          if (configLabel) return String(configLabel);
          return props.status.charAt(0).toUpperCase() + props.status.slice(1).replace(/_/g, " ");
        }
      }
      if (props.value !== undefined && typeof props.value === "boolean") {
        return props.value ? "Active" : "Inactive";
      }

      // Check explicit label/title/alt/aria-label
      if (props.label !== undefined && typeof props.label === "string") return props.label;
      if (props.title !== undefined && typeof props.title === "string") return props.title;
      if (props.alt !== undefined && typeof props.alt === "string") return props.alt;
      if (props["aria-label"] !== undefined && typeof props["aria-label"] === "string") return props["aria-label"];

      // Check children
      if (props.children !== undefined) {
        return getElementText(props.children);
      }

      // If functional component, try evaluating it safely
      if (typeof element.type === "function") {
        try {
          const rendered = element.type(props);
          if (rendered && rendered !== element) {
            return getElementText(rendered);
          }
        } catch {
          // ignore error if component uses hooks/context not present in this scope
        }
      }
    }
    return "";
  };

  // Context-aware value formatter for clean exports
  const formatValueForExport = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "boolean") return val ? "Active" : "Inactive";
    if (typeof val === "number") return String(val);
    if (typeof val === "function") return ""; // Never output native function code
    if (val instanceof Date) return val.toLocaleDateString();

    // Check if it is a React Element that got passed
    if (React.isValidElement(val)) {
      return getElementText(val);
    }

    // Check if string contains standard ISO date
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
        try {
          const d = new Date(trimmed);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
          }
        } catch { }
      }
      return trimmed.replace(/\s+/g, " ");
    }

    // Handle Arrays
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      // If array of strings or numbers
      if (val.every((item) => typeof item === "string" || typeof item === "number")) {
        return val.join(", ");
      }
      // If array of objects, extract sensible label
      const labels = val
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string" || typeof item === "number") return String(item);
          if (item.name) return item.name;
          if (item.title) return item.title;
          if (item.label) return item.label;
          if (item.display_name) return item.display_name;
          if (item.brand || item.model) {
            return [item.brand, item.model, item.plate_number ? `(${item.plate_number})` : null]
              .filter(Boolean)
              .join(" ");
          }
          if (item.service) return item.service.replace(/_/g, " ");
          if (item.role) return item.role.name || item.role;
          if (item.user) return [item.user.first_name, item.user.last_name].filter(Boolean).join(" ");
          return "";
        })
        .filter(Boolean);
      if (labels.length > 0) return labels.join(", ");
      return `${val.length} items`;
    }

    // Handle Objects (Never dump JSON brackets or [object Object])
    if (typeof val === "object") {
      if (val.name) return String(val.name);
      if (val.title) return String(val.title);
      if (val.display_name) return String(val.display_name);
      if (val.first_name || val.last_name) return [val.first_name, val.last_name].filter(Boolean).join(" ");
      if (val.brand || val.model) {
        return [val.brand, val.model, val.plate_number ? `(${val.plate_number})` : null]
          .filter(Boolean)
          .join(" ");
      }
      if (val.company_name) return String(val.company_name);
      if (val.address_line1) return [val.address_line1, val.city, val.postal_code].filter(Boolean).join(", ");
      if (val.email || val.email_address) return String(val.email || val.email_address);
      if (val.label) return String(val.label);
      if (val.iata_code) return String(val.iata_code);
      return "";
    }

    return String(val);
  };

  // Unified resolution order for cell export text (Parity between CSV and PDF)
  const getCellExportText = (row, col) => {
    let raw = undefined;

    // 1. col.exportValue
    if (col.exportValue !== undefined) {
      if (typeof col.exportValue === "function") {
        try {
          raw = col.exportValue(row);
        } catch { }
      } else if (typeof col.exportValue === "string") {
        raw = getNestedValue(row, col.exportValue);
      }
    }

    // 2. col.printable
    if (raw === undefined && col.printable !== undefined) {
      if (typeof col.printable === "function") {
        try {
          raw = col.printable(row);
        } catch { }
      } else if (typeof col.printable === "string") {
        raw = getNestedValue(row, col.printable);
      }
    }

    // 3. col.accessor
    if (raw === undefined && col.accessor !== undefined) {
      if (typeof col.accessor === "function") {
        try {
          raw = col.accessor(row);
        } catch { }
      } else if (typeof col.accessor === "string") {
        raw = getNestedValue(row, col.accessor);
      }
    }

    // If raw is a native/uncalled function, ignore it
    if (typeof raw === "function") {
      raw = undefined;
    }

    // If raw is a React element, extract text
    if (React.isValidElement(raw)) {
      raw = getElementText(raw);
    }

    // 4. col.cell fallback
    if (
      (raw === undefined || raw === "" || (typeof raw === "object" && !Array.isArray(raw))) &&
      col.cell
    ) {
      try {
        const rendered = col.cell(row);
        if (React.isValidElement(rendered)) {
          const text = getElementText(rendered);
          if (text) raw = text;
        } else if (
          rendered !== null &&
          rendered !== undefined &&
          typeof rendered !== "object"
        ) {
          raw = rendered;
        }
      } catch { }
    }

    // 5. Fallback to col.id property access
    if (raw === undefined && col.id) {
      raw = getNestedValue(row, col.id);
    }

    return formatValueForExport(raw);
  };

  // Filter out actions, operations, and explicitly excluded columns
  const getExportableColumns = (cols) => {
    return (cols || []).filter((col) => {
      if (col.export === false || col.printable === false) return false;
      const id = (col.id || "").toLowerCase();
      const header = (typeof col.header === "string" ? col.header : "").toLowerCase();
      if (
        id === "actions" ||
        id === "action" ||
        id === "_actions" ||
        id === "operations" ||
        id === "banner"
      ) {
        return false;
      }
      if (header === "actions" || header === "action" || header === "banner") return false;
      return true;
    });
  };

  const handleExportCSV = () => {
    const exportData = Array.isArray(activeData) ? activeData : [];
    if (exportData.length === 0) return;

    const exportColumns = getExportableColumns(columns);

    // Generate CSV Headers
    const headers = exportColumns.map((col) => {
      return typeof col.header === "string" ? col.header : col.id;
    });

    // Generate CSV Rows
    const csvRows = exportData.map((row) => {
      return exportColumns
        .map((col) => {
          const cellValue = getCellExportText(row, col);
          const escaped = String(cellValue ?? "").replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `table-export-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    const exportData = Array.isArray(activeData) ? activeData : [];
    if (exportData.length === 0) return;

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // Header info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Table Export", 14, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 25);

      const exportColumns = getExportableColumns(columns);
      if (exportColumns.length === 0) return;

      const startX = 14;
      let startY = 32;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const usableWidth = pageWidth - 28;
      const colWidth = usableWidth / exportColumns.length;

      // Draw headers
      doc.setFont("helvetica", "bold");
      doc.setFillColor(245, 245, 245);
      doc.rect(startX, startY, usableWidth, 7, "F");
      doc.rect(startX, startY, usableWidth, 7, "S");

      exportColumns.forEach((col, idx) => {
        const headerText = typeof col.header === "string" ? col.header : col.id;
        doc.text(headerText, startX + idx * colWidth + 2, startY + 5);
      });

      startY += 7;

      // Draw rows
      doc.setFont("helvetica", "normal");
      exportData.forEach((row) => {
        // Pre-calculate cells text and line splits
        const cellTexts = exportColumns.map((col) => {
          const rawText = getCellExportText(row, col);
          return doc.splitTextToSize(rawText, colWidth - 4);
        });

        // Find the maximum number of lines in this row
        const maxLines = Math.max(...cellTexts.map((lines) => lines.length), 1);
        const rowHeight = 3 + maxLines * 4; // 3mm padding + 4mm per line

        // Check if we need a new page
        if (startY + rowHeight > pageHeight - 15) {
          doc.addPage();
          startY = 20;

          // Draw headers on new page
          doc.setFont("helvetica", "bold");
          doc.setFillColor(245, 245, 245);
          doc.rect(startX, startY, usableWidth, 7, "F");
          doc.rect(startX, startY, usableWidth, 7, "S");
          exportColumns.forEach((col, idx) => {
            const headerText =
              typeof col.header === "string" ? col.header : col.id;
            doc.text(headerText, startX + idx * colWidth + 2, startY + 5);
          });
          startY += 7;
          doc.setFont("helvetica", "normal");
        }

        // Draw cell contents
        exportColumns.forEach((col, idx) => {
          const lines = cellTexts[idx];
          lines.forEach((line, lineIdx) => {
            doc.text(
              line,
              startX + idx * colWidth + 2,
              startY + 4 + lineIdx * 4,
            );
          });
        });

        // Draw row border
        doc.rect(startX, startY, usableWidth, rowHeight, "S");
        startY += rowHeight;
      });

      doc.save(`table-export-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
  };

  // Columns state (for column visibility)
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const toggleColumn = (colId) => {
    setVisibleColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const displayedColumns = columns.filter((col) => visibleColumns[col.id]);

  const activeChips = Object.entries(
    isControlled ? activeParams : params,
  ).filter(([key, val]) => {
    return (
      val !== "" &&
      val !== undefined &&
      val !== null &&
      !["page", "limit", "search", "sortBy", "sortOrder"].includes(key)
    );
  });

  return (
    <div
      className={`flex flex-col h-full min-h-100 max-h-[calc(100vh-160px)] w-full border border-(--bd) rounded-xl overflow-hidden bg-(--bgs) shadow-xs ${className}`}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex-none border-b border-(--bd) p-3 bg-(--bgm)/5 flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-50 max-w-sm">
              <Input
                type="text"
                placeholder={searchPlaceholder}
                isDisabled={isControlled ? activeLoading : false}
                value={
                  isControlled ? activeParams.search || "" : debouncedSearch
                }
                onChange={(e) => {
                  if (isControlled) {
                    if (onParamsChange)
                      onParamsChange({
                        ...activeParams,
                        search: e.target.value,
                        page: 1,
                      });
                  } else {
                    setDebouncedSearch(e.target.value);
                  }
                }}
                size="sm"
                leftElement={<FiSearch size={13} />}
                className="w-full rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              {filters.map((f) => {
                // Avoid prepending a duplicate "All" option when the filter's
                // options already include one with an empty value (e.g.
                // { value: "", label: "All Status" }). Two options with
                // value="" would render as <option key=""> and trigger React's
                // "Encountered two children with the same key, ''" warning.
                const hasEmptyValueOption = f.options.some(
                  (o) => o.value == null || o.value === "",
                );
                return (
                  <Select
                    key={f.id}
                    isDisabled={activeLoading}
                    value={
                      (isControlled ? activeParams[f.id] : params[f.id]) || ""
                    }
                    onChange={(e) => handleFilterChange(f.id, e.target.value)}
                    options={
                      hasEmptyValueOption
                        ? f.options
                        : [{ value: "", label: `All ${f.label}` }, ...f.options]
                    }
                    size="sm"
                    className="w-32 rounded-lg!"
                  />
                );
              })}
              {dataFilter && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-(--tm) w-44 min-w-42.5">
                    <span>From:</span>
                    <DateTimePicker
                      showTime={false}
                      disabled={activeLoading}
                      value={
                        (isControlled
                          ? activeParams.from_date
                          : params.from_date) || ""
                      }
                      onChange={(val) => handleFilterChange("from_date", val)}
                      placeholder="From Date"
                      maxDate={
                        (isControlled
                          ? activeParams.to_date
                          : params.to_date) || undefined
                      }
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-(--tm) w-44 min-w-42.5">
                    <span>To:</span>
                    <DateTimePicker
                      showTime={false}
                      disabled={activeLoading}
                      value={
                        (isControlled
                          ? activeParams.to_date
                          : params.to_date) || ""
                      }
                      onChange={(val) => handleFilterChange("to_date", val)}
                      placeholder="To Date"
                      minDate={
                        (isControlled
                          ? activeParams.from_date
                          : params.from_date) || undefined
                      }
                    />
                  </div>
                </>
              )}
              {toolbarChildren}

              {(activeChips.length > 0 ||
                (isControlled ? activeParams.search : params.search)) && (
                  <Button
                    onClick={handleResetFilters}
                    isDisabled={activeLoading}
                    variant="link"
                    size="sm"
                    className="text-[11px] px-2 py-1"
                  >
                    Reset
                  </Button>
                )}

              <div className="h-4 w-px bg-(--bd) mx-1 hidden sm:block" />

              <Button
                onClick={() => {
                  if (onRefresh) {
                    onRefresh();
                  } else {
                    handleRefresh();
                  }
                }}
                isDisabled={activeLoading}
                variant="secondary"
                size="sm"
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg min-w-9 sm:min-w-20"
                title="Refresh Data"
                leftIcon={
                  <FiRefreshCw
                    size={13}
                    className={activeLoading ? "animate-spin" : ""}
                  />
                }
              >
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {showExport && (
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={handleExportCSV}
                    isDisabled={activeLoading || !data || data.length === 0}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    title="Export CSV"
                    leftIcon={<FiFileText size={13} />}
                  >
                    <span className="hidden md:inline">Export</span>
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    isDisabled={activeLoading || !data || data.length === 0}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    title="Download PDF"
                    leftIcon={<FiFile size={13} />}
                  >
                    <span className="hidden md:inline">PDF</span>
                  </Button>
                </div>
              )}

              {showColumnVisibility && (
                <div className="relative">
                  <Button
                    onClick={() => setShowColMenu(!showColMenu)}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    title="Columns"
                    leftIcon={<FiEye size={13} />}
                  >
                    <span className="hidden md:inline">Columns</span>
                  </Button>
                  {showColMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-(--bgs) border border-(--bd) rounded-lg shadow-lg z-25 p-2 flex flex-col gap-1 text-xs">
                      <div className="font-semibold text-(--tm) px-2 py-1 border-b border-(--bd) mb-1">
                        Toggle Columns
                      </div>
                      {columns.map((col) => (
                        <Checkbox
                          key={col.id}
                          isChecked={!!visibleColumns[col.id]}
                          onChange={() => toggleColumn(col.id)}
                          label={
                            typeof col.header === "string" ? col.header : col.id
                          }
                          size="sm"
                          className="px-2 py-1 hover:bg-(--bgm)/20 rounded w-full cursor-pointer select-none"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-(--bd)/40">
              <span className="text-[10px] text-(--tm) uppercase tracking-wider font-semibold">
                Active:
              </span>
              {activeChips.map(([key, val]) => {
                const filterConfig = filters.find((f) => f.id === key);
                const label = filterConfig
                  ? filterConfig.label
                  : key === "from_date"
                    ? "From Date"
                    : key === "to_date"
                      ? "To Date"
                      : key;
                const option = filterConfig?.options.find(
                  (o) => o.value === val,
                );
                const valLabel = option ? option.label : val;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1 bg-(--bgm)/40 border border-(--bd) px-2 py-0.5 rounded-full text-[10px] text-(--tm) font-medium"
                  >
                    <span className="text-(--ts)">{label}:</span> {valLabel}
                    <Button
                      isDisabled={activeLoading}
                      onClick={() => handleFilterChange(key, "")}
                      variant="ghost"
                      size="sm"
                      className="w-4 h-4 rounded-full p-0 hover:text-rose-500"
                      leftIcon={<FiX size={10} />}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scrollable table container */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        {activeError ? (
          <ErrorState message={activeError} onRetry={handleRefresh} />
        ) : activeData.length === 0 && !activeLoading ? (
          <EmptyState
            title={
              (isControlled ? activeParams.search : params.search)
                ? "No search results"
                : activeChips.length > 0
                  ? "No matching filters"
                  : "No data available"
            }
            description={
              (isControlled ? activeParams.search : params.search)
                ? "Try checking your spelling or using more general terms."
                : activeChips.length > 0
                  ? "Try resetting some of your filter criteria."
                  : "There are no records to display at the moment."
            }
          />
        ) : (
          <table className="w-full table-auto border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-(--bgs) border-b border-(--bd) shadow-[0_1px_0_0_rgba(var(--bd),0.1)]">
              <tr>
                {displayedColumns.map((col) => {
                  const isSortable = col.sortable;
                  const isSorted = activeParams.sortBy === col.id;
                  const isDesc = isSorted && activeParams.sortOrder === "desc";
                  return (
                    <th
                      key={col.id}
                      onClick={() =>
                        isSortable && !activeLoading && handleSort(col.id)
                      }
                      className={`bg-(--bgm)/10 px-4 py-2.5 text-[10.5px] font-bold text-(--tm) uppercase tracking-wider text-left border-b border-(--bd) select-none ${isSortable
                        ? "cursor-pointer hover:bg-(--bgm)/20 transition-colors"
                        : ""
                        }`}
                    >
                      <div className="flex items-center gap-1">
                        {typeof col.header === "function"
                          ? col.header()
                          : col.header}
                        {isSortable && (
                          <span className="text-(--tl) inline-flex items-center">
                            {isSorted ? (
                              isDesc ? (
                                <FiChevronDown size={11} />
                              ) : (
                                <FiChevronUp size={11} />
                              )
                            ) : (
                              <span className="flex flex-col -space-y-1 text-(--tl) opacity-60 ml-0.5">
                                <FiChevronUp size={8} />
                                <FiChevronDown size={8} />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            {activeLoading && activeData.length === 0 ? (
              <LoadingSkeleton
                columnsCount={displayedColumns.length}
                rowsCount={params.limit || 10}
              />
            ) : (
              <tbody className="divide-y divide-(--bd)">
                {activeData.map((row, i) => (
                  <tr
                    key={`${row.id || "row"}-${i}`}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-(--bgm)/20 transition-colors duration-150 border-b border-(--bd)/50 ${onRowClick ? "cursor-pointer" : ""
                      } ${activeLoading ? "opacity-60 pointer-events-none" : ""
                      } ${typeof rowClassName === "function"
                        ? rowClassName(row, i)
                        : rowClassName || ""
                      }`}
                  >
                    {displayedColumns.map((col) => {
                      const cellVal = col.cell
                        ? col.cell(row)
                        : typeof col.accessor === "function"
                          ? col.accessor(row)
                          : row[col.accessor];
                      return (
                        <td
                          key={`${i}-${col.id}`}
                          className="px-4 py-2.5 text-(--tp) font-medium align-middle"
                        >
                          {cellVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        )}
      </div>

      {/* Pagination */}
      {showPagination && activePagination && (
        <div className="flex-none border-t border-(--bd) py-3.5 px-4 bg-(--bgm)/5">
          <Pagination
            page={activePagination.page}
            limit={activePagination.limit}
            totalItems={activePagination.totalItems}
            totalPages={activePagination.totalPages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            loading={activeLoading}
          />
        </div>
      )}
    </div>
  );
});

export const Table = DataTable;
export default DataTable;
