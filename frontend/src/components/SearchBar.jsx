import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchStocks } from '../api/stockApi';

const SearchBar = ({ onSelectStock }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const res = await searchStocks(query);
                    if (res.success) setResults(res.data);
                } catch (err) {
                    console.error('Search failed', err);
                } finally {
                    setIsSearching(false);
                    setShowDropdown(true);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [query]);

    const handleSelect = (stock) => {
        onSelectStock(stock.symbol);
        setQuery('');
        setShowDropdown(false);
    };

    return (
        <div className="search-container" ref={searchRef}>
            <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for a stock symbol or company..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                />
                {isSearching && <div className="loader small"></div>}
            </div>
            
            {showDropdown && results.length > 0 && (
                <div className="search-dropdown fade-in">
                    {results.map((stock) => (
                        <div 
                            key={stock.symbol} 
                            className="search-result-item"
                            onClick={() => handleSelect(stock)}
                        >
                            <span className="stock-symbol">{stock.symbol}</span>
                            <span className="stock-name">{stock.shortname || stock.longname}</span>
                            <span className="stock-exch">{stock.exchange}</span>
                        </div>
                    ))}
                </div>
            )}
            {showDropdown && results.length === 0 && !isSearching && query.length >= 2 && (
                <div className="search-dropdown fade-in">
                    <div className="search-no-results">No results found for "{query}"</div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
