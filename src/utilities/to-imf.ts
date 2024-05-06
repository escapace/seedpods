/*!
 *
 * Adaptation of https://github.com/denoland/deno_std licensed under the MIT
 * License found in the https://github.com/denoland/deno_std/blob/main/LICENSE file.
 *
 */

function dtPad(v: string, lPad = 2): string {
  return v.padStart(lPad, '0')
}

/**
 * Parse a date to return a IMF formatted string date
 * RFC: https://tools.ietf.org/html/rfc7231#section-7.1.1.1
 * IMF is the time format to use when generating times in HTTP
 * headers. The time being formatted must be in UTC for Format to
 * generate the correct format.
 * @param date - Date to parse
 * @returns IMF date formatted string
 */
export function toIMF(date: Date): string {
  const d = dtPad(date.getUTCDate().toString())
  const h = dtPad(date.getUTCHours().toString())
  const min = dtPad(date.getUTCMinutes().toString())
  const s = dtPad(date.getUTCSeconds().toString())
  const y = date.getUTCFullYear()
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${days[date.getUTCDay()]}, ${d} ${months[date.getUTCMonth()]} ${y} ${h}:${min}:${s} GMT`
}
