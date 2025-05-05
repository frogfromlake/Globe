/**
 * Estimate ΔT using Espenak & Meeus polynomial for 2005–2050
 */
function estimateDeltaT(year: number): number {
  const t = (year - 2000) / 100;
  return 62.92 + 32.217 * t + 55.89 * t * t;
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculates the subsolar point (latitude and longitude) on Earth at the given UTC date/time.
 * Uses apparent solar longitude, nutation, aberration, and IAU 2006 sidereal time.
 */
export function getSubsolarPoint(date = new Date()) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // === Julian Date in UTC and TT
  const JD_UTC = date.getTime() / 86400000 + 2440587.5;
  const year =
    date.getUTCFullYear() +
    (date.getUTCMonth() + 1 - 1 + date.getUTCDate() / 30) / 12;
  const deltaT = estimateDeltaT(year);
  const JD_TT = JD_UTC + deltaT / 86400;

  // === Julian centuries since J2000 (TT)
  const T = (JD_TT - 2451545.0) / 36525;

  // === Mean solar coordinates
  const L0 = normalizeAngle(280.46646 + 36000.76983 * T);
  const M = normalizeAngle(357.52911 + 35999.05029 * T);

  // === Equation of center
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * Math.sin(M * rad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * rad) +
    0.000289 * Math.sin(3 * M * rad);

  // === True longitude and distance
  const trueLon = normalizeAngle(L0 + C);
  const r =
    1.00014 - 0.01671 * Math.cos(M * rad) - 0.00014 * Math.cos(2 * M * rad);
  const aberration = -20.4898 / (3600 * r); // deg

  // === Nutation in longitude (2-term approximation from IAU 2000B)
  const omega = normalizeAngle(125.04 - 1934.136 * T);
  const deltaPsi =
    (-17.2 * Math.sin(omega * rad) - 1.32 * Math.sin(2 * L0 * rad)) / 3600; // deg

  // === Apparent longitude
  const lambdaApp = normalizeAngle(trueLon + deltaPsi + aberration);

  // === Mean obliquity of the ecliptic (arcseconds, IAU formula)
  const epsilon =
    23.43929111 - 0.0130041667 * T - 1.66667e-7 * T ** 2 + 5.02778e-7 * T ** 3;

  // === Declination
  const decl =
    Math.asin(Math.sin(epsilon * rad) * Math.sin(lambdaApp * rad)) * deg;

  // === Right ascension (RA)
  let alpha =
    Math.atan2(
      Math.cos(epsilon * rad) * Math.sin(lambdaApp * rad),
      Math.cos(lambdaApp * rad)
    ) * deg;
  if (alpha < 0) alpha += 360;

  // === GMST (Greenwich Mean Sidereal Time at UTC, IAU 2006)
  let theta =
    280.46061837 +
    360.98564736629 * (JD_UTC - 2451545.0) +
    0.000387933 * T ** 2 -
    T ** 3 / 38710000;
  theta = normalizeAngle(theta);

  // === Subsolar longitude = RA - GMST
  const lon = ((alpha - theta + 540) % 360) - 180;

  return {
    lat: decl,
    lon,
  };
}
