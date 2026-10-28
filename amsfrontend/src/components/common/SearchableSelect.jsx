import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check, Loader2 } from 'lucide-react';

/**
 * Enterprise SearchableSelect / Combobox Component
 * Allows users to click its input area and type directly to filter options.
 * Fully supports keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).
 * Matches Landis+Gyr AMS theme with clean green-and-white accents.
 * Supports optional portal rendering to avoid clipping in modals with overflow:hidden.
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  error = false,
  className = '',
  size = 'md', // 'sm' | 'md'
  allowClear = true,
  emptyMessage = 'No matching options',
  id,
  allowCustom = false,
  isLoading = false,
  usePortal = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 224,
    placement: 'bottom',
  });

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalize options into standard shape: { value, label, subLabel, disabled }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (opt === null || opt === undefined) return { value: '', label: '', subLabel: '' };
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt), subLabel: '' };
      }
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label || opt.name || opt.description || String(opt.value ?? opt.id ?? ''),
        subLabel: opt.subLabel || '',
        disabled: Boolean(opt.disabled),
      };
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null;
  }, [normalizedOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const query = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false;
      const matchValue = String(opt.value).toLowerCase().includes(query);
      return matchLabel || matchSub || matchValue;
    });
  }, [normalizedOptions, searchQuery]);

  // Calculate and update menu position when portaled
  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const defaultMaxHeight = 224; // 14rem (max-h-56)

    const shouldDropUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    let maxHeight = defaultMaxHeight;
    let top = 0;

    if (shouldDropUp) {
      maxHeight = Math.min(defaultMaxHeight, Math.max(120, spaceAbove - 16));
      top = rect.top - 4;
    } else {
      maxHeight = Math.min(defaultMaxHeight, Math.max(120, spaceBelow - 16));
      top = rect.bottom + 4;
    }

    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

    setMenuPosition({
      top,
      left,
      width,
      maxHeight,
      placement: shouldDropUp ? 'top' : 'bottom',
    });
  }, []);

  // Detect drop-up vs drop-down for non-portal rendering
  useEffect(() => {
    if (isOpen && containerRef.current && !usePortal) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 260) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen, usePortal]);

  // Synchronously compute position before paint when opening portal
  useLayoutEffect(() => {
    if (isOpen && usePortal) {
      updateMenuPosition();
    }
  }, [isOpen, usePortal, updateMenuPosition]);

  // Keep portaled dropdown aligned on scroll or window resize
  useEffect(() => {
    if (!isOpen || !usePortal) return;

    const handleScrollOrResize = (e) => {
      // Don't reposition if scrolling inside the dropdown menu itself
      if (dropdownRef.current && e?.target && dropdownRef.current.contains(e.target)) {
        return;
      }
      updateMenuPosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateMenuPosition();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isOpen, usePortal, updateMenuPosition]);

  // Handle outside clicks to close dropdown and restore valid selection label
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedInsideTrigger = containerRef.current && containerRef.current.contains(event.target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsideDropdown) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, isOpen]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredOptions.length > 0) {
      const items = listRef.current.querySelectorAll('[data-option-index]');
      const activeItem = items[highlightedIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  const handleSelect = (option) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (allowCustom && searchQuery.trim()) {
          onChange(searchQuery.trim());
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text, query) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={index} className="bg-brand-pale text-brand-deep font-semibold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const isSmall = size === 'sm';

  // Value to display in the input box
  const displayValue = isOpen ? searchQuery : (selectedOption ? selectedOption.label : (allowCustom && value ? String(value) : ''));

  const renderOptionsList = () => (
    <div
      ref={listRef}
      style={usePortal ? { maxHeight: `${menuPosition.maxHeight}px` } : undefined}
      className={`overflow-y-auto py-1 text-xs divide-y divide-gray-50 ${usePortal ? '' : 'max-h-56'}`}
    >
      {isLoading ? (
        <div className="px-3 py-4 text-center text-ams-muted text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-deep" />
          <span>Loading options...</span>
        </div>
      ) : filteredOptions.length === 0 ? (
        <div className="px-3 py-4 text-center text-ams-muted text-xs font-medium">
          {emptyMessage}
        </div>
      ) : (
        filteredOptions.map((opt, index) => {
          const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
          const isHighlighted = index === highlightedIndex;

          return (
            <div
              key={`${opt.value}-${index}`}
              data-option-index={index}
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                opt.disabled
                  ? 'opacity-40 cursor-not-allowed bg-gray-50'
                  : isHighlighted
                  ? 'bg-brand-pale/70 text-brand-deep font-medium'
                  : isSelected
                  ? 'bg-brand-pale/30 text-brand-deep font-medium'
                  : 'text-ams-text hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col truncate pr-2">
                <span className="truncate">
                  {renderHighlighted(opt.label, searchQuery)}
                </span>
                {opt.subLabel && (
                  <span className="text-[10px] text-ams-muted truncate">
                    {renderHighlighted(opt.subLabel, searchQuery)}
                  </span>
                )}
              </div>

              {isSelected && (
                <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 ml-1" />
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const menuElement = (
    <div
      ref={dropdownRef}
      style={
        usePortal
          ? {
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              transform: menuPosition.placement === 'top' ? 'translateY(-100%)' : undefined,
              zIndex: 9999,
            }
          : { minWidth: '100%' }
      }
      className={
        usePortal
          ? 'bg-white rounded-lg border border-ams-border shadow-xl overflow-hidden animation-fadeIn'
          : `absolute z-[70] left-0 right-0 bg-white rounded-lg border border-ams-border shadow-xl overflow-hidden animation-fadeIn ${
              dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
            }`
      }
    >
      {renderOptionsList()}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Searchable Input Trigger Box */}
      <div
        id={id}
        aria-expanded={isOpen}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }
        }}
        className={`w-full flex items-center justify-between rounded-lg border bg-white transition-all cursor-text ${
          isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${
          error
            ? 'border-ams-error bg-red-50/40 text-ams-error focus-within:ring-ams-error'
            : 'border-ams-border hover:border-brand-deep/50 text-ams-text'
        } ${
          isOpen ? 'ring-2 ring-brand-deep/20 border-brand-deep' : ''
        } ${
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''
        }`}
      >
        <div className="flex-1 min-w-0 pr-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={displayValue}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            onChange={(e) => {
              if (!isOpen) setIsOpen(true);
              setSearchQuery(e.target.value);
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
              }
            }}
            className="w-full bg-transparent text-ams-text placeholder:text-ams-muted focus:outline-none text-xs truncate"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 text-ams-muted">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-deep" />
          )}

          {allowClear && selectedOption && selectedOption.value !== '' && !disabled && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-gray-100 text-ams-muted hover:text-ams-text transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen((prev) => !prev);
                if (!isOpen && inputRef.current) {
                  inputRef.current.focus();
                }
              }
            }}
            className="p-0.5 focus:outline-none"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-deep' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Options Panel (rendered inline or through portal) */}
      {isOpen && !disabled && (
        usePortal && typeof document !== 'undefined'
          ? createPortal(menuElement, document.body)
          : menuElement
      )}
    </div>
  );
}
