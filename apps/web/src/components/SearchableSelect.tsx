import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeType?: 'success' | 'danger' | 'warning' | 'neutral';
  price?: number;
  unit?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an item...',
  searchPlaceholder = 'Type to search...',
  isInvalid = false,
  errorMessage,
  disabled = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const labelMatch = o.label.toLowerCase().includes(q);
    const sublabelMatch = o.sublabel ? o.sublabel.toLowerCase().includes(q) : false;
    const badgeMatch = o.badge ? o.badge.toLowerCase().includes(q) : false;
    return labelMatch || sublabelMatch || badgeMatch;
  });

  // Calculate precise fixed positioning to avoid being clipped by tables or buried behind cards
  const updateCoords = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 320);
      let left = rect.left;

      // Prevent popover from spilling off right edge of viewport
      if (left + dropdownWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - dropdownWidth - 12);
      }

      // Check vertical space (open upwards if tight space below)
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 280;
      const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left,
        width: dropdownWidth,
      });
    }
  }, []);

  // Update coords and listen to viewport changes when open
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScrollOrResize = () => {
        updateCoords();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Also check if clicked inside the fixed dropdown panel
        const target = e.target as HTMLElement;
        if (target.closest('.vk-searchable-select-popover')) {
          return;
        }
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleSelect = (optValue: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getBadgeStyle = (type?: 'success' | 'danger' | 'warning' | 'neutral') => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
      case 'danger':
        return { backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'warning':
        return { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
      case 'neutral':
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '200px',
        zIndex: isOpen ? 100 : 'auto',
        ...style,
      }}
    >
      {/* Trigger Box - Minimalist & Clean */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            updateCoords();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 11px',
          backgroundColor: disabled ? '#f9fafb' : '#ffffff',
          borderRadius: '6px',
          border: isInvalid
            ? '1.5px solid #dc2626'
            : isOpen
              ? '1.5px solid #2563eb'
              : '1px solid #cbd5e1',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {selectedOption ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0f172a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={selectedOption.label}
              >
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    marginLeft: '6px',
                    flexShrink: 0,
                    ...getBadgeStyle(selectedOption.badgeType),
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{placeholder}</span>
          )}
        </div>

        {/* Minimal Chevron */}
        <span
          style={{
            fontSize: '11px',
            color: '#64748b',
            marginLeft: '8px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            display: 'inline-block',
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </div>

      {/* Inline Error Message */}
      {isInvalid && errorMessage && (
        <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600, marginTop: '3px' }}>
          {errorMessage}
        </div>
      )}

      {/* Popover Dropdown Panel - Fixed Position & Maximum z-index (Never Behind Cards) */}
      {isOpen && coords && (
        <div
          className="vk-searchable-select-popover"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: '300px',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box Header */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '12.5px',
                color: '#0f172a',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '2px 4px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Options Scrollable List - Clean & Minimalist */}
          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: '#94a3b8',
                }}
              >
                No items matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '5px',
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      opacity: opt.disabled ? 0.5 : 1,
                      transition: 'background-color 0.1s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? '#1d4ed8' : '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#64748b',
                              marginTop: '1px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {opt.sublabel}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {opt.price !== undefined && (
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                            ₹{opt.price}
                            {opt.unit ? `/${opt.unit}` : ''}
                          </span>
                        )}
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '10px',
                              ...getBadgeStyle(opt.badgeType),
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
