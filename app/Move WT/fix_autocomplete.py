import re

# Read the file
with open('../move-wt/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add autocomplete instance refs after the address refs
old_refs = '''  // Refs for autocomplete inputs
  const pickupAddressRef = useRef<HTMLInputElement>(null);
  const deliveryAddressRef = useRef<HTMLInputElement>(null);
  const additionalStopAddressRef = useRef<HTMLInputElement>(null);'''

new_refs = '''  // Refs for autocomplete inputs
  const pickupAddressRef = useRef<HTMLInputElement>(null);
  const deliveryAddressRef = useRef<HTMLInputElement>(null);
  const additionalStopAddressRef = useRef<HTMLInputElement>(null);
  const pickupAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const deliveryAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const additionalStopAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);'''

content = content.replace(old_refs, new_refs)

# Fix 2: Update the autocomplete initialization  to store instances and clean up
old_init = '''    // Start Address Autocomplete
    if (pickupAddressRef.current) {
      const pickupAutocomplete = new google.maps.places.Autocomplete(pickupAddressRef.current, options);
      pickupAutocomplete.addListener('place_changed', () => {
        const place = pickupAutocomplete.getPlace();
        parseAddressComponents(place, 'pickup');
      });
    }

    // Delivery Address Autocomplete
    if (deliveryAddressRef.current) {
      const deliveryAutocomplete = new google.maps.places.Autocomplete(deliveryAddressRef.current, options);
      deliveryAutocomplete.addListener('place_changed', () => {
        const place = deliveryAutocomplete.getPlace();
        parseAddressComponents(place, 'delivery');
      });
    }

    // Additional Stop Address Autocomplete
    if (additionalStopAddressRef.current) {
      const additionalStopAutocomplete = new google.maps.places.Autocomplete(additionalStopAddressRef.current, options);
      additionalStopAutocomplete.addListener('place_changed', () => {
        const place = additionalStopAutocomplete.getPlace();
        parseAddressComponents(place, 'additionalStop');
      });
    }
  };

  // Initialize autocomplete when Google is loaded or when additional stop is toggled
  useEffect(() => {
    if (isGoogleLoaded) {
      initializeAutocomplete();
    }
  }, [isGoogleLoaded, formData.hasAdditionalStop]);'''

new_init = '''    // Cleanup function to remove existing autocomplete instances
    const cleanup = () => {
      if (pickupAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
      }
      if (deliveryAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(deliveryAutocompleteRef.current);
      }
      if (additionalStopAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(additionalStopAutocompleteRef.current);
      }
    };

    // Clean up before creating new instances
    cleanup();

    // Start Address Autocomplete
    if (pickupAddressRef.current && !pickupAutocompleteRef.current) {
      pickupAutocompleteRef.current = new google.maps.places.Autocomplete(pickupAddressRef.current, options);
      pickupAutocompleteRef.current.addListener('place_changed', () => {
        const place = pickupAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'pickup');
      });
    }

    // Delivery Address Autocomplete
    if (deliveryAddressRef.current && !deliveryAutocompleteRef.current) {
      deliveryAutocompleteRef.current = new google.maps.places.Autocomplete(deliveryAddressRef.current, options);
      deliveryAutocompleteRef.current.addListener('place_changed', () => {
        const place = deliveryAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'delivery');
      });
    }

    // Additional Stop Address Autocomplete
    if (additionalStopAddressRef.current && !additionalStopAutocompleteRef.current) {
      additionalStopAutocompleteRef.current = new google.maps.places.Autocomplete(additionalStopAddressRef.current, options);
      additionalStopAutocompleteRef.current.addListener('place_changed', () => {
        const place = additionalStopAutocompleteRef.current?.getPlace();
        if (place) parseAddressComponents(place, 'additionalStop');
      });
    }
  };

  // Initialize autocomplete when Google is loaded or when additional stop is toggled
  useEffect(() => {
    if (isGoogleLoaded) {
      initializeAutocomplete();
    }

    // Cleanup on unmount
    return () => {
      if (pickupAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(pickupAutocompleteRef.current);
      }
      if (deliveryAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(deliveryAutocompleteRef.current);
      }
      if (additionalStopAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(additionalStopAutocompleteRef.current);
      }
    };
  }, [isGoogleLoaded, formData.hasAdditionalStop]);'''

content = content.replace(old_init, new_init)

# Write back
with open('../move-wt/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed autocomplete initialization")
