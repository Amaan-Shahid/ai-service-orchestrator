const dataset = require("../dataset/providers.json");

const providers = dataset.providers;

function normalizeText(text) {
  return text?.toLowerCase().trim() || "";
}

function compactText(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, "");
}

function normalizeLocationText(location) {
  return normalizeText(location)
    .replace(/\b([a-z])\s*[- ]?\s*(\d{1,2})\b/g, "$1-$2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSector(location) {
  const normalizedLocation = normalizeLocationText(location);
  const match = normalizedLocation.match(/\b([a-z])-(\d{1,2})\b/);

  if (!match) {
    return null;
  }

  return {
    letter: match[1].toUpperCase(),
    number: Number(match[2]),
    label: `${match[1].toUpperCase()}-${Number(match[2])}`,
  };
}

const serviceAliases = {
  "AC Technician": [
    "ac",
    "ac repair",
    "ac service",
    "ac technician",
    "air conditioner",
    "air conditioning",
    "hvac",
  ],
  Beautician: ["beautician", "beauty", "makeup", "salon", "parlor", "parlour"],
  Carpenter: ["carpenter", "carpentry", "wood work", "woodwork", "furniture"],
  Electrician: [
    "electrician",
    "electric",
    "electrical",
    "electric repair",
    "wiring",
  ],
  "Home Cleaner": [
    "cleaner",
    "cleaning",
    "home cleaner",
    "house cleaning",
    "maid",
  ],
  "Mobile Repair": [
    "mobile",
    "mobile repair",
    "phone",
    "phone repair",
    "cell phone",
  ],
  Painter: ["painter", "painting", "paint"],
  Plumber: ["plumber", "plumbing", "pipe", "leak", "water leak"],
  Tutor: ["tutor", "tuition", "teacher", "teaching", "home tutor"],
};

function canonicalService(service) {
  const normalizedService = normalizeText(service);
  const compactService = compactText(service);

  return Object.entries(serviceAliases).find(([name, aliases]) => {
    const serviceNames = [name, ...aliases];

    return serviceNames.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      const compactAlias = compactText(alias);

      return (
        normalizedService === normalizedAlias ||
        compactService === compactAlias ||
        normalizedService.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedService)
      );
    });
  })?.[0];
}

function canonicalLocation(location) {
  const sector = parseSector(location);

  if (sector) {
    const sectorMatch = [...new Set(providers.map((provider) => provider.location))].find(
      (providerLocation) => parseSector(providerLocation)?.label === sector.label
    );

    if (sectorMatch) {
      return sectorMatch;
    }
  }

  const compactLocation = compactText(location);

  return [...new Set(providers.map((provider) => provider.location))].find(
    (providerLocation) => compactLocation.includes(compactText(providerLocation))
  );
}

function calculateLocationDistance(requestedLocation, providerLocation) {
  const requestedSector = parseSector(requestedLocation);
  const providerSector = parseSector(providerLocation);

  if (requestedSector && providerSector) {
    const letterDistance = Math.abs(
      requestedSector.letter.charCodeAt(0) - providerSector.letter.charCodeAt(0)
    );
    const numberDistance = Math.abs(requestedSector.number - providerSector.number);

    return letterDistance * 4 + numberDistance;
  }

  const compactRequested = compactText(requestedLocation);
  const compactProvider = compactText(providerLocation);

  if (!compactRequested || !compactProvider) {
    return 50;
  }

  if (
    compactRequested.includes(compactProvider) ||
    compactProvider.includes(compactRequested)
  ) {
    return 0;
  }

  return 25;
}

function calculateScore(provider) {
  let score = 0;

  score += provider.rating * 20;

  score += Math.min((provider.service_radius_km || 0) * 2, 20);

  score += Math.max(0, 20 - provider.response_time_minutes / 5);

  score += Math.min(provider.completed_jobs / 20, 20);

  score += Math.min(provider.experience_years, 10);

  return score;
}

function matchProviders(intent) {
  if (!intent) {
    return [];
  }

  const { service, location } = intent;
  const matchedService = canonicalService(service);
  const matchedLocation = canonicalLocation(location);

  if (!matchedService) {
    return [];
  }

  const availableServiceProviders = providers
    .filter((provider) => {
      const serviceMatch = provider.service === matchedService;
      return serviceMatch && provider.available;
    })
    .map((provider) => ({
      ...provider,
      score: calculateScore(provider),
      locationMatch: matchedLocation
        ? provider.location === matchedLocation
        : calculateLocationDistance(location, provider.location) === 0,
      locationDistance: calculateLocationDistance(
        matchedLocation || location,
        provider.location
      ),
    }));

  const exactLocationProviders = availableServiceProviders.filter(
    (provider) => provider.locationMatch
  );

  const matchedProviders =
    exactLocationProviders.length > 0
      ? exactLocationProviders
      : availableServiceProviders;

  matchedProviders.sort((a, b) => {
    if (a.locationDistance !== b.locationDistance) {
      return a.locationDistance - b.locationDistance;
    }

    return b.score - a.score;
  });

  return matchedProviders;
}

module.exports = matchProviders;
