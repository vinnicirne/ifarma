import React, { useState, useEffect, useRef } from 'react';
import { MaterialIcon } from './MaterialIcon';

interface AddressAutocompleteProps {
    value: string;
    onChange: (address: string) => void;
    onSelect?: (address: string, lat: number, lng: number) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const AddressAutocomplete = ({ value, onChange, onSelect, placeholder = "Digite o endereço...", disabled = false }: AddressAutocompleteProps) => {
    const [inputValue, setInputValue] = useState(value);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        if (!autocompleteService.current && (window as any).google) {
            autocompleteService.current = new (window as any).google.maps.places.AutocompleteService();
            // Create a dummy div for PlacesService as it requires an HTML element or a map
            const dummyDiv = document.createElement('div');
            placesService.current = new (window as any).google.maps.places.PlacesService(dummyDiv);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue); // Propagate raw value while typing
        setError(null);

        if (newValue.length > 2 && autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { input: newValue, componentRestrictions: { country: 'br' } },
                (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results);
                        setShowPredictions(true);
                        setError(null);
                    } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        setPredictions([]);
                        setShowPredictions(false);
                    } else {
                        console.error("Google Maps API Error:", status);
                        setPredictions([]);
                        setShowPredictions(false);
                        if (status === 'REQUEST_DENIED') {
                            setError('Erro: Chave de API inválida ou não habilitada (billing).');
                        } else {
                            setError(`Erro na busca: ${status}`);
                        }
                    }
                }
            );
        } else {
            setPredictions([]);
            setShowPredictions(false);
        }
    };

    const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
        const fullAddress = prediction.description;
        setInputValue(fullAddress);
        onChange(fullAddress);
        setShowPredictions(false);

        if (onSelect && placesService.current) {
            placesService.current.getDetails(
                { placeId: prediction.place_id, fields: ['geometry'] },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        onSelect(fullAddress, lat, lng);
                    }
                }
            );
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                disabled={disabled}
                className={`w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none ${error ? 'ring-2 ring-red-500' : ''}`}
                placeholder={placeholder}
                onBlur={() => setTimeout(() => setShowPredictions(false), 200)} // Delay to allow click
                onFocus={() => inputValue.length > 2 && setPredictions(prev => prev.length > 0 ? (setShowPredictions(true), prev) : prev)}
            />
            {disabled && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 cursor-not-allowed rounded-xl" />}

            {error && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{error}</p>
            )}

            {showPredictions && predictions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
                    {predictions.map((prediction) => (
                        <div
                            key={prediction.place_id}
                            onClick={() => handleSelectPrediction(prediction)}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full shrink-0">
                                <MaterialIcon name="location_on" className="text-slate-500 text-sm" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                    {prediction.structured_formatting.main_text}
                                </span>
                                <span className="text-xs text-slate-500 truncate">
                                    {prediction.structured_formatting.secondary_text}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center justify-end p-2 bg-slate-50 dark:bg-zinc-950">
                        <img
                            src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png"
                            alt="Powered by Google"
                            className="h-4 opacity-70"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
