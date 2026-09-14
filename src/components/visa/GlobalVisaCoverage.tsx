'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/app.store';
import { countriesData, type CountryConfig } from './countries-data';
import VisaGlobe from './VisaGlobe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function GlobalVisaCoverage() {
  const navigate = useAppStore((s) => s.navigate);

  // Selected & Hovered country context
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryConfig | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // WebGL Fallback detection
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const support = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setTimeout(() => setWebGlSupported(support), 0);
    } catch {
      setTimeout(() => setWebGlSupported(false), 0);
    }
  }, []);

  // Filtered country results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return countriesData.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Featured countries list
  const featuredCountries = useMemo(() => {
    return countriesData.filter((c) => c.featured);
  }, []);

  const handleSelectCountry = (country: CountryConfig | null) => {
    setSelectedCountry(country);
    if (country) {
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleExplore = (country: CountryConfig) => {
    // If authenticated, we could route directly. For landing page guests, navigate to login
    navigate('login');
  };

  return (
    <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-[#020512] border-y border-vvisa-border-subtle">
      {/* Premium deep space backdrop */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#020512] to-[#01030a] opacity-90 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#4f46e5]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-[1.1fr_1.8fr] gap-12 items-center">
          
          {/* LEFT SIDE CONTENT */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-vvisa-border-subtle bg-slate-900/60 px-4 py-1.5 backdrop-blur-md"
              >
                <Sparkles className="size-3.5 text-[#4f46e5]" />
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-300">
                  Global Visa Coverage
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none"
              >
                Your Journey.
                <br />
                Our Expertise.
                <br />
                <span className="text-[#4f46e5]">Worldwide.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              >
                Explore destinations supported by V-VISA and discover the visa assistance available for your journey.
              </motion.p>
            </div>

            {/* Stats list / highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0 pt-4"
            >
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                <p className="text-3xl font-extrabold text-white">48+</p>
                <p className="text-xs text-slate-400 mt-1">Countries Supported</p>
              </div>
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                <p className="text-3xl font-extrabold text-[#10b981]">99.9%</p>
                <p className="text-xs text-slate-400 mt-1">OCR Accuracy Rate</p>
              </div>
            </motion.div>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Button
                size="lg"
                className="h-12 px-7 text-base rounded-xl glow-indigo"
                onClick={() => navigate('login')}
              >
                Explore All Countries <ChevronRight className="ml-1 size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 text-base rounded-xl border-white/10 bg-white/[0.02] text-slate-300 hover:text-white"
                onClick={() => navigate('login')}
              >
                Find Your Visa
              </Button>
            </motion.div>

            {/* Visual Legend */}
            <div className="flex items-center gap-6 justify-center lg:justify-start text-xs pt-4 border-t border-white/5 max-w-sm mx-auto lg:mx-0">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Visa Services Available
              </span>
              <span className="flex items-center gap-2 text-slate-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Coming Soon
              </span>
            </div>
          </div>

          {/* RIGHT SIDE GLOBE & INTERACTIONS */}
          <div className="relative flex flex-col items-center justify-center min-h-[550px] w-full">
            
            {/* SEARCH AND FEATURED CARDS */}
            <div className="absolute top-4 left-4 z-20 w-[240px] hidden sm:block space-y-3">
              {/* Search Destination */}
              <div className="relative rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md p-3 shadow-lg">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search destination..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className="h-9 pl-9 pr-7 py-1.5 text-xs text-white bg-slate-900/50 border-white/5 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {showSearchResults && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 mt-2 max-h-[180px] overflow-y-auto rounded-lg border border-white/10 bg-slate-950 shadow-2xl z-50 text-xs divide-y divide-white/5 scrollbar-thin"
                    >
                      {searchResults.map((country) => (
                        <button
                          key={country.id}
                          onClick={() => handleSelectCountry(country)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                        >
                          <span>{country.flag}</span>
                          <span className="flex-1 font-medium">{country.name}</span>
                          {country.available ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                              Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                              Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Featured Countries Card */}
              <div className="rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md p-4 shadow-lg">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="size-3.5 text-indigo-400" />
                  Featured Countries
                </h3>
                <div className="space-y-1.5 text-xs">
                  {featuredCountries.map((country) => {
                    const isSelected = selectedCountry?.id === country.id;
                    return (
                      <button
                        key={country.id}
                        onMouseEnter={() => setHoveredCountry(country)}
                        onMouseLeave={() => setHoveredCountry(null)}
                        onClick={() => handleSelectCountry(country)}
                        className={`w-full px-2 py-1.5 rounded-md flex items-center gap-2 text-left transition-all duration-200 border ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-white/[0.05] border-transparent'
                        }`}
                      >
                        <span>{country.flag}</span>
                        <span className="flex-1 font-medium">{country.name}</span>
                        <ChevronRight className={`size-3.5 opacity-50 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D GLOBE CANVAS OR ACCESSIBLE GRID FALLBACK */}
            {webGlSupported ? (
              <VisaGlobe
                selectedCountry={selectedCountry}
                hoveredCountry={hoveredCountry}
                onSelectCountry={handleSelectCountry}
                onHoverCountry={setHoveredCountry}
              />
            ) : (
              /* Fallback list when WebGL is unsupported */
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 max-h-[500px] overflow-y-auto border border-white/5 rounded-2xl bg-slate-950/40">
                {countriesData.map((country) => (
                  <button
                    key={country.id}
                    onClick={() => handleSelectCountry(country)}
                    className="p-3 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/80 hover:border-white/10 text-left text-xs transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{country.flag}</span>
                      <span className="text-white font-semibold">{country.name}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${country.available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-slate-400">
                        {country.available ? 'Visa Services Ready' : 'Coming Soon'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* DYNAMIC SELECTED COUNTRY PANEL */}
            <AnimatePresence>
              {selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-30 sm:w-[320px] rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl p-5 shadow-2xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl select-none">{selectedCountry.flag}</span>
                      <div>
                        <h4 className="text-lg font-bold text-white leading-tight">
                          {selectedCountry.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                          {selectedCountry.available ? 'Visa Available' : 'Coming Soon'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectCountry(null)}
                      className="p-1 rounded-full text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {selectedCountry.available
                      ? `V-VISA provides comprehensive assistance for travel to ${selectedCountry.name}. Choose from standard, express, or multiple-entry categories.`
                      : `We are currently coordinating with immigration partners to establish reliable visa assistance paths for ${selectedCountry.name}.`}
                  </p>

                  {selectedCountry.available && (
                    <div className="space-y-2 mb-4">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Supported Assistance
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCountry.visaTypes.map((v) => (
                          <span
                            key={v}
                            className="px-2 py-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-md"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => handleExplore(selectedCountry)}
                    className="w-full text-xs h-9 rounded-lg"
                  >
                    {selectedCountry.available ? `Explore ${selectedCountry.name} →` : 'Get Notified When Ready'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </div>
    </section>
  );
}
