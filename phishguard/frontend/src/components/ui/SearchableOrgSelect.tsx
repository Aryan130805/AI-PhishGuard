import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Building2, CheckCircle2, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../lib/api';

export interface OrganizationPublic {
  id: number;
  name: string;
  logo_url?: string | null;
  industry?: string | null;
  is_verified?: boolean;
}

interface SearchableOrgSelectProps {
  selectedOrg: OrganizationPublic | null;
  onSelectOrg: (org: OrganizationPublic | null) => void;
  error?: string;
}

export const SearchableOrgSelect: React.FC<SearchableOrgSelectProps> = ({
  selectedOrg,
  onSelectOrg,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationPublic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownId = useId();

  // Fetch initial organizations list
  const fetchOrganizations = async (query: string = '') => {
    setIsLoading(true);
    try {
      const endpoint = query.trim()
        ? `${API_BASE}/organizations/search?q=${encodeURIComponent(query.trim())}`
        : `${API_BASE}/organizations`;

      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Ensure alphabetical sort
        const sorted = (Array.isArray(data) ? data : []).sort((a: OrganizationPublic, b: OrganizationPublic) =>
          a.name.localeCompare(b.name)
        );
        setOrganizations(sorted);
      } else {
        setOrganizations([]);
      }
    } catch {
      setOrganizations([]);
    } fontally: {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrganizations('');
  }, []);

  // Debounced search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganizations(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < organizations.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : organizations.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < organizations.length) {
        handleSelect(organizations[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (org: OrganizationPublic) => {
    onSelectOrg(org);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Building2 size={13} className="text-emerald-400" />
          Select Organization <span className="text-rose-400">*</span>
        </span>
        {selectedOrg && (
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 size={11} /> Selected
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full text-left px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white flex items-center justify-between transition-all duration-200 focus:outline-none ${
            error
              ? 'border-rose-500/80 ring-1 ring-rose-500/50'
              : isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {selectedOrg ? (
            <div className="flex items-center gap-2.5 truncate">
              {selectedOrg.logo_url ? (
                <img
                  src={selectedOrg.logo_url}
                  alt={selectedOrg.name}
                  className="w-5 h-5 rounded-md object-cover bg-slate-800"
                />
              ) : (
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {selectedOrg.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-white truncate">{selectedOrg.name}</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={10} /> Verified
              </span>
            </div>
          ) : (
            <span className="text-slate-500 font-normal">Select an existing verified organization...</span>
          )}

          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            id={dropdownId}
            role="listbox"
            className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input Box */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="🔍 Search organization by name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
              {isLoading && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin"
                />
              )}
            </div>

            {/* List Options */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {isLoading && organizations.length === 0 ? (
                // Skeleton Loader
                <div className="p-3 space-y-2">
                  <div className="h-8 bg-slate-800/50 rounded-lg animate-pulse" />
                  <div className="h-8 bg-slate-800/40 rounded-lg animate-pulse" />
                  <div className="h-8 bg-slate-800/30 rounded-lg animate-pulse" />
                </div>
              ) : organizations.length > 0 ? (
                organizations.map((org, index) => {
                  const isSelected = selectedOrg?.id === org.id;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <button
                      key={org.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(org)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all duration-150 ${
                        isSelected
                          ? 'bg-emerald-500/15 text-white font-medium border border-emerald-500/30'
                          : isHighlighted
                          ? 'bg-slate-800/80 text-white'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-5 h-5 rounded object-cover bg-slate-800"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{org.name}</span>
                        {org.industry && (
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            • {org.industry}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={9} /> Verified
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                // Empty state helper text
                <div className="p-4 text-center space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                  <AlertCircle size={20} className="mx-auto text-amber-400/80" />
                  <p className="text-xs font-semibold text-slate-300">
                    No organization matches &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Can&apos;t find your organization?<br />
                    Contact your administrator or ask them to register first on the Organization Portal.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] font-medium text-rose-400">{error}</p>}
    </div>
  );
};
