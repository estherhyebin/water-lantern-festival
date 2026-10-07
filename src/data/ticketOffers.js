export const MAX_TICKET_QUANTITY = 20

export const TICKET_OFFERS = [
  {
    id: 'general',
    name: 'General Admission',
    descriptionLines: [
      'Each General Admission ticket includes:',
      '- Entry wristband for festival access',
      '- 1 festival kit with a lantern and other goodies',
      '- Entry into our scavenger hunt giveaway',
    ],
    displayPrice: '$30.99',
    unitCents: 3099,
    increment: 1,
    packageSize: 1,
  },
  {
    id: 'date-night',
    name: 'Date Night Special – 25% Off!',
    descriptionLines: [
      'This romantic package includes:',
      '- 2 General Admission tickets',
      '- 1 blanket',
    ],
    displayPrice: '$79.16',
    unitCents: 7916,
    increment: 2,
    packageSize: 2,
  },
  {
    id: 'group',
    name: 'Group Deal - Save 20%',
    descriptionLines: [
      'Sold in packs of 4 General Admission tickets.',
      'Includes all General Admission benefits for each person.',
    ],
    displayPrice: '$24.99',
    unitCents: 2499,
    increment: 4,
    packageSize: 1,
  },
]

export function emptyQuantities() {
  return Object.fromEntries(TICKET_OFFERS.map((offer) => [offer.id, 0]))
}

export function quantityOptions(increment, max = MAX_TICKET_QUANTITY) {
  const values = []
  for (let value = 0; value <= max; value += increment) values.push(value)
  return values
}

export function lineTotalCents(offer, quantity) {
  const count = Number(quantity) || 0
  if (count <= 0) return 0
  if (offer.packageSize > 1) {
    return Math.round((count / offer.packageSize) * offer.unitCents)
  }
  return count * offer.unitCents
}

export function cartTotalCents(quantities) {
  return TICKET_OFFERS.reduce(
    (sum, offer) => sum + lineTotalCents(offer, quantities[offer.id]),
    0,
  )
}

export function formatMoney(cents) {
  const value = Number(cents) || 0
  const dollars = Math.round(value) / 100
  return `$${dollars.toFixed(2)}`
}

export function selectedTicketLines(quantities) {
  return TICKET_OFFERS.filter((offer) => (quantities[offer.id] || 0) > 0).map(
    (offer) => ({
      id: offer.id,
      name: offer.name,
      quantity: quantities[offer.id],
      total: formatMoney(lineTotalCents(offer, quantities[offer.id])),
    }),
  )
}
