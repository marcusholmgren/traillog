/**
 * Formats a coordinate value (latitude or longitude) to a string with 3-4 decimal places.
 * Uses US English locale for consistent decimal formatting.
 *
 * @param input - The coordinate value to format.
 * @param maximumFractionDigits - Maximum fraction digits
 * @returns The formatted coordinate string.
 */
export function coordinateFormat(
  input: number,
  maximumFractionDigits: number = 4
) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: maximumFractionDigits,
  }).format(input);
}

/**
 * Formats a number or bigint as a distance in meters, using the user's locale.
 * Displays with one decimal place and uses the "narrow" unit display.
 *
 * @param input - The numeric value to format.
 * @param unit - The unit to display the value in
 * @param maximumFractionDigits - Maximum fraction digits
 * @returns The formatted distance string with unit.
 */
export function numberFormat(
  input: number | bigint,
  unit: string = "meter",
  maximumFractionDigits: number = 1
) {
  const userLocales = navigator.languages || [navigator.language];
  return new Intl.NumberFormat(userLocales, {
    minimumFractionDigits: 1,
    maximumFractionDigits: maximumFractionDigits,
    style: "unit",
    unit: unit,
    unitDisplay: "narrow",
  }).format(input);
}

/**
 * Formats a date or timestamp to a localized string with full date and short time.
 * Uses the user's browser locale settings.
 *
 * @param number - The date or timestamp to format.
 * @returns The formatted date-time string.
 */
export function dateFormatter(number: number | Date) {
  const userLocales = navigator.languages || [navigator.language];
  const seLong = new Intl.DateTimeFormat(userLocales, {
    dateStyle: "full",
    timeStyle: "short",
  });
  return seLong.format(number);
}
