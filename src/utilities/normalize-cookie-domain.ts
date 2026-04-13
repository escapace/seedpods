import { isIP } from 'node:net'
import { domainToASCII, domainToUnicode } from 'node:url'
import type { SeedpodsErrorCause } from '../types'

const DOMAIN_LABEL_LENGTH_MAX = 63

type CookieDomainValidationResult =
  | { causes: Array<SeedpodsErrorCause<'CookieOptionValueInvalid'>>; ok: false }
  | { ok: true; value: string }

function createDomainErrorCause(reason: string): SeedpodsErrorCause<'CookieOptionValueInvalid'> {
  return {
    option: 'domain',
    reason,
    type: 'CookieOptionValueInvalid',
  }
}

function invalidDomain(reason: string): CookieDomainValidationResult {
  return { causes: [createDomainErrorCause(reason)], ok: false }
}

function isAscii(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) > 0x7f) {
      return false
    }
  }

  return true
}

function isAlphaNumeric(character: string): boolean {
  return /[\da-z]/i.test(character)
}

function isLdhCharacter(character: string): boolean {
  return /[\da-z-]/i.test(character)
}

function isValidLdhShape(label: string): boolean {
  if (label.length === 0 || label.length > DOMAIN_LABEL_LENGTH_MAX) {
    return false
  }

  if (!isAlphaNumeric(label[0]) || !isAlphaNumeric(label[label.length - 1])) {
    return false
  }

  for (let index = 0; index < label.length; index++) {
    if (!isLdhCharacter(label[index])) {
      return false
    }
  }

  return true
}

function isNrLdhLabel(label: string): boolean {
  return isValidLdhShape(label) && label.slice(2, 4) !== '--'
}

function isPotentialXnLabel(label: string): boolean {
  return label.toLowerCase().startsWith('xn--')
}

function validateALabel(label: string): CookieDomainValidationResult {
  const normalized = label.toLowerCase()

  if (!isValidLdhShape(normalized)) {
    return invalidDomain('contains a label that is not a valid LDH label')
  }

  const unicode = domainToUnicode(normalized)

  if (unicode === '' || unicode === normalized || isAscii(unicode)) {
    return invalidDomain('contains a fake A-label')
  }

  const roundTrip = domainToASCII(unicode)

  if (roundTrip === '' || roundTrip.toLowerCase() !== normalized) {
    return invalidDomain('contains a fake A-label')
  }

  return { ok: true, value: normalized }
}

function isIpLiteralForCookieDomain(value: string): boolean {
  return value.startsWith('[') || value.endsWith(']') || isIP(value) !== 0
}

export function validateCookieDomain(domain: string): CookieDomainValidationResult {
  if (domain.length === 0) {
    return invalidDomain('must not be empty')
  }

  const candidate = domain.startsWith('.') ? domain.slice(1) : domain

  if (candidate.length === 0) {
    return invalidDomain('must not be empty after removing a leading "."')
  }

  if (candidate.endsWith('.')) {
    return invalidDomain('must not end with "."')
  }

  if (isIpLiteralForCookieDomain(candidate)) {
    return invalidDomain('must not be an IP literal')
  }

  const labels = candidate.split('.')

  if (labels.some((label) => label.length === 0)) {
    return invalidDomain('contains an empty domain label')
  }

  const normalizedLabels: string[] = []

  for (const label of labels) {
    // TODO: Add exact Unicode host label handling here.
    //
    // RFC6265bis canonicalized host names require each label to be one of:
    // - U-label
    // - A-label
    // - Non-Reserved LDH (NR-LDH) label
    // and require rejection of fake A-labels.
    //
    // This implementation currently handles only ASCII labels. ASCII labels are
    // classified below as either NR-LDH or validated A-labels. Any non-ASCII
    // label is rejected here so the function stays within behavior it can
    // validate exactly.
    //
    // When Unicode domain labels are supported, replace this rejection with a
    // branch that:
    // 1. validates the input label as a U-label using an auditable
    //    IDNA2008-conformant implementation,
    // 2. converts that U-label to its canonical A-label form for the final
    //    serialized cookie domain,
    // 3. enforces the RFC5890 symmetry requirement by checking that the A-label
    //    decodes back to the same valid U-label and re-encodes to the same
    //    canonical A-label,
    // 4. rejects labels that are not valid U-labels, and
    // 5. keeps the existing fake A-label rejection path for ASCII `xn--...`
    //    labels.
    //
    // `url.domainToASCII()` is not enough on its own for this branch because it
    // is a host canonicalization helper, not a complete RFC5890/RFC5891 label
    // validator.
    if (!isAscii(label)) {
      return invalidDomain('must contain only ASCII labels; Unicode labels are not supported')
    }

    if (isNrLdhLabel(label)) {
      normalizedLabels.push(label.toLowerCase())
      continue
    }

    if (isPotentialXnLabel(label)) {
      const result = validateALabel(label)

      if (!result.ok) {
        return result
      }

      normalizedLabels.push(result.value)
      continue
    }

    return invalidDomain('contains a label that is not NR-LDH or a valid A-label')
  }

  return { ok: true, value: normalizedLabels.join('.') }
}
