/**
 * Server-Side Pricing Engine
 * Single Source of Truth for all financial arithmetic
 * All calculations performed in integer paise (1 INR = 100 paise) to eliminate float rounding errors.
 */

export function calculatePriceQuote({
  unit = null,
  unitType,
  adults,
  nights = 1,
  children5to10 = 0,
  infantsUnder5 = 0,
  includeNonVegPlan = false,
  includeBonfire = false
}) {
  const effectiveUnitType = unit?.unitType || unitType;
  const parsedNights = Math.max(1, parseInt(nights, 10) || 1);
  const parsedAdults = parseInt(adults, 10);
  const parsedChildren = Math.max(0, parseInt(children5to10, 10) || 0);
  const parsedInfants = Math.max(0, parseInt(infantsUnder5, 10) || 0);

  if (!parsedAdults || parsedAdults < 1) {
    throw new Error('At least 1 adult guest is required.');
  }

  const isCamping = effectiveUnitType === 'camping_tent';

  // 1. Strict Unit-Type Capacity Guard
  const isCherryBlossomOrGulmohar = 
    effectiveUnitType === 'red_white_cottage' || 
    unit?.code?.startsWith('CB-') || 
    unit?.code?.startsWith('GM-');

  if (isCherryBlossomOrGulmohar) {
    if (parsedAdults > 3) {
      throw new Error('Capacity limitation: Cherry Blossom and Gulmohar strictly allow a maximum of 3 adults. For 4 adults, please select Riverwood, Autumn Abode, Spring Abode, or Amberwood.');
    }
  } else if (isCamping) {
    if (parsedAdults > 5) {
      throw new Error('Camping capacity limitation: Maximum 5 overnight guests across the 2 camping tents.');
    }
  } else {
    // 4-person cottages (Riverwood, Autumn Abode, Spring Abode, Amberwood)
    if (parsedAdults > 4) {
      throw new Error('Capacity limitation: This cottage allows a maximum of 4 adults.');
    }
  }

  // 2. Base Stay Calculation (in Paise)
  let baseRatePerNightPaise = 0;

  if (isCamping) {
    const perPersonRate = unit?.campingRatesPaise?.perPerson ?? 149900;
    const coupleRate = unit?.campingRatesPaise?.couple ?? 299900;

    if (parsedAdults === 1) {
      baseRatePerNightPaise = perPersonRate; // ₹1,499
    } else if (parsedAdults === 2) {
      baseRatePerNightPaise = coupleRate; // Strictly ₹2,999 (never ₹2,998)
    } else {
      // 3 or more camping guests
      baseRatePerNightPaise = parsedAdults * perPersonRate;
    }
  } else {
    // Cottage rates: check unit.pricingTiersPaise or unit.pricingTiers
    const tiersPaise = unit?.pricingTiersPaise || {};
    const tiersRupees = unit?.pricingTiers || {};

    const getTierPaise = (tierKey, defaultRupees) => {
      if (tiersPaise[tierKey] !== undefined && tiersPaise[tierKey] !== null) {
        return Math.round(Number(tiersPaise[tierKey]));
      }
      if (tiersRupees[tierKey] !== undefined && tiersRupees[tierKey] !== null) {
        return Math.round(Number(tiersRupees[tierKey]) * 100);
      }
      return defaultRupees * 100;
    };

    if (parsedAdults === 1) {
      baseRatePerNightPaise = getTierPaise('oneAdult', 3000); // ₹3,000
    } else if (parsedAdults === 2) {
      baseRatePerNightPaise = getTierPaise('twoAdults', 4000); // ₹4,000
    } else if (parsedAdults === 3) {
      baseRatePerNightPaise = getTierPaise('threeAdults', 5400); // ₹5,400
    } else if (parsedAdults === 4) {
      if (!isCherryBlossomOrGulmohar) {
        baseRatePerNightPaise = getTierPaise('fourAdults', 6600); // ₹6,600
      } else {
        throw new Error('4-guest rate is not permitted on this unit type.');
      }
    }
  }

  const baseStayTotalPaise = baseRatePerNightPaise * parsedNights;

  // 3. Children Tariffs (5–10 years)
  // Under 5 is 0 paise (Free)
  const defaultChildRate = isCamping ? 75000 : 70000; // ₹750 camping, ₹700 cottage
  const childRatePerNightPaise = unit?.addonsPaise?.child5to10Paise ?? defaultChildRate;
  const childrenTotalPaise = parsedChildren * childRatePerNightPaise * parsedNights;

  // 4. Non-Vegetarian Meal Supplements (Packages default to veg)
  let nonVegTotalPaise = 0;
  if (includeNonVegPlan) {
    if (isCamping) {
      // Camping dinner supplement: ₹150 per person per night default
      const campingNonVegRate = unit?.addonsPaise?.nonVegAdultPaise ?? 15000;
      nonVegTotalPaise = parsedAdults * campingNonVegRate * parsedNights;
    } else {
      // Cottage lunch+dinner supplement: ₹300 per adult per night, child: ₹150 default
      const adultSupp = parsedAdults * (unit?.addonsPaise?.nonVegAdultPaise ?? 30000);
      const childSupp = parsedChildren * (unit?.addonsPaise?.nonVegChildPaise ?? 15000);
      nonVegTotalPaise = (adultSupp + childSupp) * parsedNights;
    }
  }

  // 5. Bonfire Hearth Add-on (For cottages; camping includes bonfire)
  let bonfireTotalPaise = 0;
  if (includeBonfire && !isCamping) {
    // Minimum 2 paying guests
    const billableGuests = Math.max(2, parsedAdults);
    const bonfireRate = unit?.addonsPaise?.bonfirePerPersonPaise ?? 25000;
    bonfireTotalPaise = billableGuests * bonfireRate * parsedNights; // ₹250/person/night
  }

  // 6. Totals & 50% Advance Breakdown
  const grandTotalPaise = baseStayTotalPaise + childrenTotalPaise + nonVegTotalPaise + bonfireTotalPaise;
  const advancePayablePaise = Math.round(grandTotalPaise * 0.5); // 50% advance to confirm
  const balanceDuePaise = grandTotalPaise - advancePayablePaise; // 50% at check-in

  return {
    nights: parsedNights,
    adults: parsedAdults,
    children5to10: parsedChildren,
    infantsUnder5: parsedInfants,
    paise: {
      baseRatePerNight: baseRatePerNightPaise,
      baseStayTotal: baseStayTotalPaise,
      childrenTotal: childrenTotalPaise,
      nonVegTotal: nonVegTotalPaise,
      bonfireTotal: bonfireTotalPaise,
      grandTotal: grandTotalPaise,
      advancePayable: advancePayablePaise,
      balanceDue: balanceDuePaise
    },
    rupees: {
      baseRatePerNight: Math.round(baseRatePerNightPaise / 100),
      baseStayTotal: Math.round(baseStayTotalPaise / 100),
      childrenTotal: Math.round(childrenTotalPaise / 100),
      nonVegTotal: Math.round(nonVegTotalPaise / 100),
      bonfireTotal: Math.round(bonfireTotalPaise / 100),
      grandTotal: Math.round(grandTotalPaise / 100),
      advancePayable: Math.round(advancePayablePaise / 100),
      balanceDue: Math.round(balanceDuePaise / 100)
    }
  };
}
