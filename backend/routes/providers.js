const express = require("express");
const dataset = require("../dataset/providers.json");

const router = express.Router();

function publicProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    service: provider.service,
    location: provider.location,
    rating: provider.rating,
    service_radius_km: provider.service_radius_km,
    available: provider.available,
    experience_years: provider.experience_years,
    languages: provider.languages || [],
    phone: provider.phone,
    response_time_minutes: provider.response_time_minutes,
    completed_jobs: provider.completed_jobs,
  };
}

router.get("/", (req, res) => {
  const service = req.query.service?.trim().toLowerCase();
  const location = req.query.location?.trim().toLowerCase();

  const providers = dataset.providers
    .map(publicProvider)
    .filter((provider) => {
      const serviceMatch =
        !service || provider.service.toLowerCase().includes(service);
      const locationMatch =
        !location || provider.location.toLowerCase().includes(location);

      return serviceMatch && locationMatch;
    });

  res.json({
    providers,
    total: providers.length,
  });
});

module.exports = router;
