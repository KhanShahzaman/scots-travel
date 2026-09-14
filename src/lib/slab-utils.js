export function normalizeAndValidateSlabs(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("At least one slab is required.");
  }

  const slabs = input
    .map((item, index) => ({
      fromMiles: Number(item.fromMiles),
      toMiles: item.toMiles == null || item.toMiles === "" ? null : Number(item.toMiles),
      ratePerMile: Number(item.ratePerMile),
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
    }))
    .sort((a, b) => a.fromMiles - b.fromMiles);

  for (const slab of slabs) {
    if (!Number.isInteger(slab.fromMiles) || slab.fromMiles < 1) {
      throw new Error("Each slab fromMiles must be an integer >= 1.");
    }
    if (slab.toMiles != null && (!Number.isInteger(slab.toMiles) || slab.toMiles < slab.fromMiles)) {
      throw new Error("Each slab toMiles must be null or an integer >= fromMiles.");
    }
    if (!Number.isFinite(slab.ratePerMile) || slab.ratePerMile <= 0) {
      throw new Error("Each slab ratePerMile must be > 0.");
    }
  }

  if (slabs[0].fromMiles !== 1) {
    throw new Error("First slab must start from 1 mile.");
  }

  for (let index = 0; index < slabs.length; index += 1) {
    const slab = slabs[index];
    const isLast = index === slabs.length - 1;
    const next = slabs[index + 1];

    if (!isLast && slab.toMiles == null) {
      throw new Error("Only the last slab can be open-ended.");
    }

    if (!isLast) {
      const expectedNextFrom = slab.toMiles + 1;
      if (next.fromMiles !== expectedNextFrom) {
        throw new Error("Slabs must be contiguous without gaps or overlaps.");
      }
    }
  }

  return slabs.map((slab, index) => ({
    fromMiles: slab.fromMiles,
    toMiles: slab.toMiles,
    ratePerMile: slab.ratePerMile,
    order: index + 1,
  }));
}
