import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Path } from "@/types/index";
import { ChevronRight, ChevronLeft, ChevronDown, Check, Search } from "lucide-react";

export interface HierarchicalPathSelectorProps {
  paths: Path[];
  selectedPathId: string | null;
  onChange: (pathId: string | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  excludeIds?: string[];
  className?: string;
}

export function HierarchicalPathSelector({
  paths,
  selectedPathId,
  onChange,
  placeholder = "All Paths",
  allowEmpty = true,
  excludeIds = [],
  className = "",
}: HierarchicalPathSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mouseDownRef = useRef(false); // distinguish mouse vs keyboard focus
  const suppressOpenOnFocusRef = useRef(false); // skip auto-open for programmatic refocus after select
  const refocusTriggerRef = useRef(false); // after select, return focus to the trigger

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setCurrentParentId(null);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // After a selection closes the dropdown, return focus to the (closed) trigger
  // so the parent form's Enter handler still fires instead of focus falling to
  // <body>. Runs post-close; the suppress flag stops the trigger's focus
  // handler from reopening the dropdown.
  useEffect(() => {
    if (isOpen || !refocusTriggerRef.current) return;
    refocusTriggerRef.current = false;
    suppressOpenOnFocusRef.current = true;
    triggerRef.current?.focus();
  }, [isOpen]);

  // Build hierarchy from flat paths
  const { pathMap, childrenMap, filteredPaths } = useMemo(() => {
    const pathMap = new Map<string, Path>();
    const childrenMap = new Map<string | null, Path[]>();

    // Filter out excluded IDs and their descendants
    const excludeSet = new Set(excludeIds);

    // First pass: identify all descendants of excluded paths
    const findDescendants = (parentId: string): string[] => {
      const descendants: string[] = [];
      paths.forEach(p => {
        if (p.parentId === parentId) {
          descendants.push(p._id);
          descendants.push(...findDescendants(p._id));
        }
      });
      return descendants;
    };

    excludeIds.forEach(id => {
      findDescendants(id).forEach(d => excludeSet.add(d));
    });

    // Filter paths
    const filteredPaths = paths.filter(p => !excludeSet.has(p._id));

    // Build maps
    filteredPaths.forEach(path => {
      pathMap.set(path._id, path);
      const parentKey = path.parentId || null;
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(path);
    });

    // Sort children alphabetically
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.title.localeCompare(b.title));
    });

    return {
      pathMap,
      childrenMap,
      filteredPaths,
    };
  }, [paths, excludeIds]);

  // Get full path string for a path (for search and display)
  const getFullPathString = useCallback((pathId: string): string => {
    const trail: string[] = [];
    let current = pathMap.get(pathId);
    while (current) {
      trail.unshift(current.title);
      current = current.parentId ? pathMap.get(current.parentId) : undefined;
    }
    return trail.join(" > ");
  }, [pathMap]);

  // Search results (flat list when searching)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    return filteredPaths
      .filter(path => {
        const fullPath = getFullPathString(path._id).toLowerCase();
        return fullPath.includes(query);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [searchQuery, filteredPaths, getFullPathString]);

  // Get breadcrumb trail from root to current parent
  const breadcrumbs = useMemo(() => {
    if (!currentParentId) return [];

    const trail: Path[] = [];
    let current = pathMap.get(currentParentId);
    while (current) {
      trail.unshift(current);
      current = current.parentId ? pathMap.get(current.parentId) : undefined;
    }
    return trail;
  }, [currentParentId, pathMap]);

  // Get currently displayed paths (children of current parent)
  const currentPaths = useMemo(() => {
    return childrenMap.get(currentParentId) || [];
  }, [childrenMap, currentParentId]);

  // Check if a path has children
  const hasChildren = useCallback((pathId: string) => {
    return (childrenMap.get(pathId) || []).length > 0;
  }, [childrenMap]);

  // Trigger shows just the selected path's own name (not the full trail).
  const selectedPathDisplay = useMemo(() => {
    if (!selectedPathId) return placeholder;
    return pathMap.get(selectedPathId)?.title ?? placeholder;
  }, [selectedPathId, pathMap, placeholder]);

  // Handle selecting a path
  const handleSelect = useCallback((pathId: string | null) => {
    onChange(pathId);
    setIsOpen(false);
    setCurrentParentId(null);
    setSearchQuery("");
    // Return focus to the trigger once the dropdown has closed (deferred to an
    // effect so the now-unmounted dropdown isn't briefly a focus target).
    refocusTriggerRef.current = true;
  }, [onChange]);

  // Handle drilling down into a path
  const handleDrillDown = useCallback((pathId: string) => {
    setCurrentParentId(pathId);
    setSearchQuery("");
  }, []);

  // Handle going back
  const handleBack = useCallback(() => {
    if (breadcrumbs.length > 1) {
      setCurrentParentId(breadcrumbs[breadcrumbs.length - 2]._id);
    } else {
      setCurrentParentId(null);
    }
  }, [breadcrumbs]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={() => { mouseDownRef.current = true; }}
        onClick={() => { setIsOpen((o) => !o); mouseDownRef.current = false; }}
        onFocus={() => {
          if (suppressOpenOnFocusRef.current) { suppressOpenOnFocusRef.current = false; return; }
          if (!mouseDownRef.current) setIsOpen(true);
        }}
        className="flex items-center justify-between w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className={`flex-1 min-w-0 truncate text-left ${selectedPathId ? "" : "text-muted-foreground"}`}>
          {selectedPathDisplay}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-input shadow-md overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
          {/* Search input */}
          <div className="p-2 border-b border-input">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-input bg-muted/30">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search paths..."
                className="flex-1 bg-transparent text-sm outline-none focus-visible:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Breadcrumb header (when drilled in and not searching) - back + current. */}
          {currentParentId && !isSearching && (
            <div className="flex items-center gap-1.5 px-2 py-2 border-b border-input bg-muted/30">
              <button
                type="button"
                onClick={handleBack}
                className="p-1 rounded hover:bg-muted shrink-0"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium truncate">{pathMap.get(currentParentId)?.title}</span>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-1">
            {/* Search results mode */}
            {isSearching ? (
              <>
                {searchResults && searchResults.length > 0 ? (
                  searchResults.map(path => (
                    <button
                      key={path._id}
                      type="button"
                      onClick={() => handleSelect(path._id)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors text-left ${
                        selectedPathId === path._id ? "bg-primary-light text-primary font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <span className="flex-1 min-w-0 truncate">{getFullPathString(path._id)}</span>
                      {selectedPathId === path._id && <Check className="w-4 h-4 ml-2 shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No paths match "{searchQuery}"
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Empty/placeholder option */}
                {allowEmpty && !currentParentId && (
                  <button
                    type="button"
                    onClick={() => handleSelect(null)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedPathId === null ? "bg-primary-light text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    <span className={selectedPathId === null ? "" : "text-muted-foreground"}>{placeholder}</span>
                    {selectedPathId === null && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                )}

                {/* "Select this level" option when drilled in */}
                {currentParentId && (
                  <button
                    type="button"
                    onClick={() => handleSelect(currentParentId)}
                    className={`flex items-center justify-between w-full px-3 py-2 mb-1 rounded-md text-sm transition-colors ${
                      selectedPathId === currentParentId ? "bg-primary-light font-medium" : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-primary">Select "{pathMap.get(currentParentId)?.title}"</span>
                    {selectedPathId === currentParentId && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                )}

                {/* Path options - clicking a parent drills in, a leaf selects. */}
                {currentPaths.map(path => {
                  const childed = hasChildren(path._id);
                  return (
                    <button
                      key={path._id}
                      type="button"
                      onClick={() => (childed ? handleDrillDown(path._id) : handleSelect(path._id))}
                      className={`flex items-center w-full px-3 py-2 rounded-md text-sm text-left transition-colors ${
                        selectedPathId === path._id ? "bg-primary-light text-primary font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <span className="flex-1 min-w-0 truncate">{path.title}</span>
                      {selectedPathId === path._id && <Check className="w-4 h-4 ml-2 shrink-0" />}
                      {childed && <ChevronRight className="w-4 h-4 ml-1 shrink-0 text-muted-foreground" />}
                    </button>
                  );
                })}

                {/* Empty state */}
                {currentPaths.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {currentParentId ? "No children" : "No paths available"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
