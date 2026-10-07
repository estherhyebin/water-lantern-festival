import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const execFileAsync = promisify(execFile)

const BASE = 'https://www.waterlanternfestival.com'
const USER_AGENT =
  'WLFPortfolioScraper/1.0 (personal UX prototype; public event listings only)'
const MIN_DELAY_MS = 600
const MAX_DELAY_MS = 1000
const MAX_RETRIES = 2

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

const US_STATES = new Set([
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  'D.C.',
  'District of Columbia',
])

const CA_PROVINCES = new Set([
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
])

const TICKET_HOSTS = [
  'tickets.waterlanternfestival.com',
  'eu.waterlanternfestival.com',
  'ticketspice.com',
  'webconnex.com',
]

const SKIP_PATH_PREFIXES = [
  '/blog',
  '/about',
  '/faq',
  '/fundraising',
  '/privacy',
  '/press',
  '/sponsors',
  '/contact',
  '/order-confirmation',
  '/release-waiver',
  '/why-attend',
  '/radianttour',
  '/environmental',
]

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(rootDir, 'src', 'data', 'events.json')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function requestDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1))
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toIsoDate(year, month, day) {
  if (!year || !month || !day) return null
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function parseMonthName(word) {
  return MONTHS[cleanText(word).toLowerCase()] || null
}

function isPlaceholderDate(iso) {
  return iso === '2027-01-01' || iso === '2026-01-01' || iso === '2025-01-01'
}

function normalizeUrl(href, base = BASE) {
  if (!href) return null
  try {
    const url = new URL(href, base)
    url.hash = ''
    url.search = ''
    let pathname = url.pathname.replace(/\/+$/, '') || '/'
    url.pathname = pathname
    url.protocol = 'https:'
    return url.toString()
  } catch {
    return null
  }
}

function isLocalizedPath(pathname) {
  return /^\/(fr|es|it-it|pt-br)(\/|$)/.test(pathname)
}

function isEventUrl(href) {
  const normalized = normalizeUrl(href)
  if (!normalized) return false
  const url = new URL(normalized)
  if (url.hostname !== 'www.waterlanternfestival.com') return false
  if (isLocalizedPath(url.pathname)) return false
  if (SKIP_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return false
  }
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length !== 2 || parts[0] !== 'events') return false
  if (['find-an-event', 'all', 'index'].includes(parts[1])) return false
  return true
}

function isStateUrl(href) {
  const normalized = normalizeUrl(href)
  if (!normalized) return false
  const url = new URL(normalized)
  if (url.hostname !== 'www.waterlanternfestival.com') return false
  if (isLocalizedPath(url.pathname)) return false
  const parts = url.pathname.split('/').filter(Boolean)
  return parts.length === 2 && parts[0] === 'states'
}

function isCheckoutUrl(href) {
  try {
    const url = new URL(href, BASE)
    return TICKET_HOSTS.some((host) => url.hostname.includes(host))
  } catch {
    return false
  }
}

function collectMatchingLinks($, predicate) {
  const found = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (predicate(href)) found.add(normalizeUrl(href))
  })
  return found
}

async function fetchWithCurl(url) {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-sS',
      '-L',
      '--max-time',
      '25',
      '-A',
      USER_AGENT,
      '-o',
      '-',
      '-w',
      '\n__CURLMETA__:%{http_code} %{url_effective}',
      url,
    ],
    { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 },
  )
  const marker = '\n__CURLMETA__:'
  const idx = stdout.lastIndexOf(marker)
  const text = idx >= 0 ? stdout.slice(0, idx) : stdout
  const meta = idx >= 0 ? stdout.slice(idx + marker.length).trim() : '0'
  const [statusRaw, ...urlParts] = meta.split(/\s+/)
  return {
    status: Number(statusRaw) || 0,
    text,
    finalUrl: urlParts.join(' ').trim() || url,
  }
}

async function fetchPage(url) {
  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const { status, text, finalUrl } = await fetchWithCurl(url)
      let originHost = ''
      let finalHost = ''
      try {
        originHost = new URL(url).hostname
        finalHost = new URL(finalUrl).hostname
      } catch {
        // ignore
      }
      if (finalHost && originHost && finalHost !== originHost) {
        return {
          ok: true,
          status: 200,
          text: '',
          url,
          offsiteRedirect: finalUrl,
        }
      }
      if (status === 429 || status >= 500) {
        lastError = new Error(`HTTP ${status}`)
        await sleep(1500 * (attempt + 1))
        continue
      }
      return { ok: status >= 200 && status < 400, status, text, url: finalUrl }
    } catch (error) {
      lastError = error
      await sleep(1000 * (attempt + 1))
    }
  }
  return {
    ok: false,
    status: 0,
    text: '',
    url,
    error: lastError?.message || 'network failure',
  }
}

function parseSitemapEventUrls(xml) {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1])
  return locs.filter((loc) => isEventUrl(loc)).map((loc) => normalizeUrl(loc))
}

function parseSitemapStateUrls(xml) {
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1])
  return locs.filter((loc) => isStateUrl(loc)).map((loc) => normalizeUrl(loc))
}

function jsonLdEvents($) {
  const blocks = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text()
    try {
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of list) {
        if (item && item['@type'] === 'Event') blocks.push(item)
      }
    } catch {
      // ignore malformed json-ld
    }
  })
  return blocks
}

function firstOfferUrl(offers) {
  for (const offer of offers || []) {
    const url = cleanText(offer.url)
    if (url && url !== '#' && isCheckoutUrl(url)) return url
  }
  return null
}

function availabilityStatus(offer, extraText = '') {
  const hay = `${offer?.availability || ''} ${extraText}`.toLowerCase()
  if (/sold\s*out/.test(hay) || hay.includes('soldout')) return 'sold-out'
  if (/expired/.test(hay)) return 'expired'
  if (/upcoming|preorder|pre-order/.test(hay)) return 'upcoming'
  if (/limited/.test(hay)) return 'limited'
  if (/outofstock|out of stock/.test(hay)) return 'sold-out'
  if (/instock|in stock|available/.test(hay)) return 'available'
  return null
}

function parsePrice(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value).replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/)
  return match ? Number(match[1]) : null
}

function normalizeTierName(name) {
  const n = cleanText(name)
  if (/early bird/i.test(n)) return 'Early Bird'
  if (/last call|late pricing/i.test(n)) return 'Last Call'
  if (/at (the )?event|day of event/i.test(n)) return 'At Event'
  if (/regular/i.test(n)) return 'Regular'
  return n || null
}

function ticketGroupName(name) {
  const n = cleanText(name)
  if (/vip/i.test(n)) return 'VIP'
  if (/date night/i.test(n)) return 'Date Night'
  if (/family|friends|4-pack|bundle/i.test(n)) return 'Family/Friends'
  if (/group/i.test(n)) return 'Group Package'
  if (/early bird|regular|last call|late pricing|at (the )?event|day of event|general/i.test(n)) {
    return 'General Admission'
  }
  return n || 'General Admission'
}

function htmlToLines(html) {
  const broken = String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n')
  const text = cheerio.load(`<div>${broken}</div>`)('div').text()
  const lines = []
  for (const line of text.split('\n').map(cleanText).filter(Boolean)) {
    if (lines[lines.length - 1] !== line) lines.push(line)
  }
  return lines
}

function looksComingSoon($) {
  const heading = cleanText($('h1, h2, h3').first().text())
  if (/will return soon/i.test(heading)) return true
  const visibleText = htmlToLines($.html('body')).join('\n')
  return /event date coming soon|date coming soon/i.test(visibleText)
}

function parseSingleDate(text) {
  const value = cleanText(text)
  const m = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  )
  if (!m) return null
  return toIsoDate(Number(m[3]), parseMonthName(m[1]), Number(m[2]))
}

function parseDateTokens(text) {
  const value = cleanText(text)
  if (/date coming soon|coming soon/i.test(value)) {
    return { dates: [], comingSoon: true }
  }

  const range = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:&|and|–|-|—)\s*(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  )
  if (range) {
    const month = parseMonthName(range[1])
    const startDay = Number(range[2])
    const endDay = Number(range[3])
    const year = Number(range[4])
    if (endDay >= startDay && endDay - startDay <= 6) {
      const dates = []
      for (let day = startDay; day <= endDay; day += 1) {
        dates.push(toIsoDate(year, month, day))
      }
      return { dates, comingSoon: false }
    }
    return { dates: [], comingSoon: false, ambiguous: true }
  }

  const single = parseSingleDate(value)
  if (single) return { dates: [single], comingSoon: false }
  return { dates: [], comingSoon: false }
}

function parseClock(text) {
  const value = cleanText(text)
  const match = value.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)?/i)
  if (!match) return null
  const clock = match[1].includes(':') ? match[1] : `${match[1]}:00`
  const meridiem = match[2] ? match[2].toUpperCase() : null
  return { clock, meridiem, raw: match[0] }
}

function withMeridiem(clock, meridiem) {
  if (!clock) return null
  return meridiem ? `${clock} ${meridiem}` : clock
}

function parseTimeRange(text, fallbackMeridiem = 'PM') {
  const value = cleanText(text)
  const range = value.match(
    /(\d{1,2}(?::\d{2})?)\s*(AM|PM)?\s*(?:-|–|—)\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)?/i,
  )
  if (range) {
    const startMer = (range[2] || range[4] || fallbackMeridiem || '').toUpperCase() || null
    const endMer = (range[4] || range[2] || fallbackMeridiem || '').toUpperCase() || null
    const startClock = range[1].includes(':') ? range[1] : `${range[1]}:00`
    const endClock = range[3].includes(':') ? range[3] : `${range[3]}:00`
    return {
      startTime: withMeridiem(startClock, startMer),
      endTime: withMeridiem(endClock, endMer),
      isRange: true,
    }
  }
  const single = parseClock(value)
  if (!single) return { startTime: null, endTime: null, isRange: false }
  return {
    startTime: withMeridiem(single.clock, single.meridiem || fallbackMeridiem),
    endTime: null,
    isRange: false,
  }
}

function visible($, el) {
  const $el = $(el)
  if ($el.closest('.w-condition-invisible').length) return false
  if ($el.hasClass('w-dyn-bind-empty')) return false
  return true
}

function sectionLines($, headingPattern) {
  const heading = $('p, h2, h3, h4')
    .filter((_, el) => headingPattern.test(cleanText($(el).text())) && visible($, el))
    .first()
  if (!heading.length) return []
  const container = heading.closest('.event-info-item').length
    ? heading.closest('.event-info-item')
    : heading.parent()
  return htmlToLines(container.html()).filter((line) => !/^as seen on:?$/i.test(line))
}

function extractCityState($, jsonLd) {
  const locationHeading = $('.subheading.is-location')
    .filter((_, el) => visible($, el))
    .first()
  let city = null
  let state = null
  if (locationHeading.length) {
    const bits = locationHeading
      .parent()
      .text()
      .split(',')
      .map((part) => cleanText(part))
      .filter(Boolean)
    city = bits[0] || null
    state = bits[1] || null
  }
  if (!city) {
    const titles = $('.radiant-location-title')
      .filter((_, el) => visible($, el))
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t && t !== ',')
    if (titles[0]) city = titles[0]
    if (titles[1]) state = titles[1]
  }
  if (!city && jsonLd?.name) city = cleanText(jsonLd.name)
  if (!state && jsonLd?.location?.address?.addressRegion) {
    state = cleanText(jsonLd.location.address.addressRegion)
  }
  return { city: city || null, state: state || null }
}

function inferCountry(state, jsonLd) {
  const fromLd = cleanText(jsonLd?.location?.address?.addressCountry)
  if (fromLd) {
    if (fromLd.length === 2) {
      if (fromLd === 'US') return 'USA'
      if (fromLd === 'GB') return 'United Kingdom'
      return fromLd
    }
    if (/united states|usa|u\.s\./i.test(fromLd)) return 'USA'
    return fromLd
  }
  if (state && US_STATES.has(state)) return 'USA'
  if (state && CA_PROVINCES.has(state)) return 'Canada'
  return null
}

function extractDatesAndTimes($, jsonLd) {
  const comingSoon = looksComingSoon($)
  const dateLines = sectionLines($, /^(dates?)$/i)
  const dates = []
  let foundComingSoon = comingSoon
  let startTime = null

  const consume = [...dateLines]
  while (consume.length) {
    const line = consume.shift()
    if (/^(dates?|get tickets|saturday|sunday|monday|tuesday|wednesday|thursday|friday)$/i.test(line)) {
      continue
    }
    const parsed = parseDateTokens(line)
    if (parsed.comingSoon) foundComingSoon = true
    if (parsed.dates.length) {
      let timeLine = null
      if (consume[0] && /^at$/i.test(consume[0]) && consume[1]) {
        consume.shift()
        timeLine = consume.shift()
      } else if (consume[0] && parseClock(consume[0])) {
        timeLine = consume.shift()
      }
      const times = timeLine ? parseTimeRange(timeLine, 'PM') : { startTime: null, endTime: null }
      if (times.startTime) startTime = times.startTime
      for (const iso of parsed.dates) {
        dates.push({
          date: iso,
          startTime: times.startTime,
          endTime: times.endTime,
        })
      }
    }
  }

  if (!dates.length && jsonLd?.startDate && !foundComingSoon && !isPlaceholderDate(jsonLd.startDate)) {
    dates.push({
      date: jsonLd.startDate,
      startTime,
      endTime: jsonLd.endDate && jsonLd.endDate !== jsonLd.startDate ? null : null,
    })
  }

  if (foundComingSoon) {
    return {
      dates: [{ date: null, startTime: null, endTime: null, dateStatus: 'coming-soon' }],
      dateStatus: 'coming-soon',
    }
  }

  const unique = []
  const seen = new Set()
  for (const item of dates) {
    const key = `${item.date}|${item.startTime}|${item.endTime}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }
  return { dates: unique, dateStatus: unique.length ? 'scheduled' : 'unknown' }
}

function uniqueTextParts(parts, skipValue = null) {
  const seen = new Set()
  const skip = skipValue ? cleanText(skipValue).toLowerCase() : null
  const unique = []
  for (const part of parts) {
    const value = cleanText(part)
    if (!value) continue
    const key = value.toLowerCase()
    if (skip && key === skip) continue
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
  }
  return unique
}

function collapseAddress(venue, address) {
  if (!address) return null
  const parts = uniqueTextParts(String(address).split(','), venue)
  return parts.length ? parts.join(', ') : null
}

function extractLocation($) {
  const lines = sectionLines($, /^location$/i).filter(
    (line) => !/^(location|view on map)$/i.test(line),
  )
  if (!lines.length) return { venue: null, address: null }
  const venue = lines[0] || null
  const addressLines = uniqueTextParts(lines.slice(1), venue)
  const address = collapseAddress(venue, addressLines.join(', '))
  if (venue && /^\d/.test(venue) && !address) {
    return { venue: null, address: venue }
  }
  return { venue, address }
}

function uniqueSchedule(items) {
  const seen = new Set()
  const schedule = []
  for (const item of items) {
    const time = cleanText(item?.time)
    const activity = cleanText(item?.activity)
    if (!time || !activity) continue
    const key = `${time.toLowerCase()}|${activity.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    schedule.push({ time, activity })
  }
  return schedule
}

function extractSchedule($) {
  const lines = sectionLines($, /^event schedule$/i).filter(
    (line) => !/^(event schedule|as seen on:?)$/i.test(line),
  )
  const schedule = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const looksTime = /^\d{1,2}(?::\d{2})?(\s*(AM|PM))?\s*($|-|–|—)/i.test(line)
    if (!looksTime) continue
    const time = cleanText(line.replace(/\s+/g, ' '))
    const activity = lines[i + 1] && !/^\d{1,2}/.test(lines[i + 1]) ? lines[i + 1] : null
    if (activity) {
      schedule.push({ time, activity })
      i += 1
    }
  }
  return uniqueSchedule(schedule)
}

function extractTicketUrl($, jsonLd, html) {
  const fromLd = firstOfferUrl(jsonLd?.offers)
  if (fromLd) return fromLd

  const candidates = []
  $('a[href]').each((_, el) => {
    if (!visible($, el)) return
    const href = $(el).attr('href')
    const text = cleanText($(el).text())
    if (!href || href === '#') return
    const buyish = /buy now|get tickets|tickets|purchase/i.test(text)
    if (isCheckoutUrl(href)) candidates.push(normalizeUrl(href) || href)
    else if (buyish && /ticket/i.test(href)) candidates.push(normalizeUrl(href) || href)
  })
  if (candidates[0]) return candidates[0]

  const hostMatch = html.match(
    /https:\/\/(?:tickets\.waterlanternfestival\.com|eu\.waterlanternfestival\.com)\/[A-Za-z0-9_/-]+/,
  )
  return hostMatch ? hostMatch[0].replace(/["'<>].*$/, '') : null
}

function extractTickets(jsonLd) {
  const offers = jsonLd?.offers
  if (!Array.isArray(offers) || offers.length === 0) return []

  const groups = new Map()
  for (const offer of offers) {
    const rawName = cleanText(offer.name)
    if (!rawName) continue
    const price = parsePrice(offer.price)
    const status = availabilityStatus(offer)
    const group = ticketGroupName(rawName)
    const tier = normalizeTierName(rawName)
    if (!groups.has(group)) groups.set(group, [])
    if (price == null && !cleanText(offer.price)) continue
    groups.get(group).push({
      tier,
      price,
      currency: cleanText(offer.priceCurrency) || 'USD',
      status: status || 'available',
    })
  }

  const tickets = []
  for (const [name, pricing] of groups) {
    if (!pricing.length) continue
    if (pricing.length === 1) {
      tickets.push({
        name,
        tier: pricing[0].tier,
        price: pricing[0].price,
        currency: pricing[0].currency,
        status: pricing[0].status,
      })
    } else {
      tickets.push({ name, pricing })
    }
  }
  return tickets
}

function makeId(city, url, firstDate) {
  const slug = url.split('/').filter(Boolean).at(-1) || slugify(city) || 'event'
  if (firstDate) return `${slug}-${firstDate}`
  return `${slug}-coming-soon`
}

function parseEventPage(html, pageUrl) {
  const $ = cheerio.load(html)
  const jsonLd = jsonLdEvents($)[0] || null
  const warnings = []

  const { city, state } = extractCityState($, jsonLd)
  const country = inferCountry(state, jsonLd)
  const { dates, dateStatus } = extractDatesAndTimes($, jsonLd)
  const { venue, address } = extractLocation($)
  const schedule = extractSchedule($)
  const tickets = extractTickets(jsonLd)
  const ticketUrl = extractTicketUrl($, jsonLd, html)
  const eventUrl = normalizeUrl(pageUrl)
  const firstDate = dates.find((d) => d.date)?.date || null

  if (!city) warnings.push('city not found')
  if (!venue && dateStatus !== 'coming-soon') warnings.push('venue not found')
  if (!dates.length) warnings.push('dates not found')
  if (!ticketUrl && dateStatus !== 'coming-soon') warnings.push('ticket URL not found')
  if (!tickets.length && dateStatus !== 'coming-soon') warnings.push('ticket data not found')

  const event = {
    id: makeId(city, eventUrl, firstDate),
    name: 'Water Lantern Festival',
    city,
    state,
    country,
    dates:
      dateStatus === 'coming-soon'
        ? dates
        : dates.map(({ date, startTime, endTime }) => ({
            date,
            startTime,
            endTime,
          })),
    venue,
    address,
    schedule,
    tickets,
    ticketUrl,
    eventUrl,
    source: 'Water Lantern Festival',
    sourceUrl: eventUrl,
    lastUpdated: todayStamp(),
  }

  if (dateStatus === 'coming-soon') event.dateStatus = 'coming-soon'

  return { event, warnings }
}

async function discoverEventUrls() {
  const urls = new Set()
  const failed = []
  let sitemapOk = false

  console.log('Fetching sitemap...')
  const sitemap = await fetchPage(`${BASE}/sitemap.xml`)
  if (sitemap.ok) {
    sitemapOk = true
    for (const url of parseSitemapEventUrls(sitemap.text)) urls.add(url)
    console.log(`Sitemap event URLs: ${urls.size}`)
  } else {
    failed.push(`sitemap.xml (${sitemap.status || sitemap.error})`)
    console.log('Sitemap unavailable, falling back to crawl.')
  }

  const seedPages = [`${BASE}/`, `${BASE}/find-an-event`]
  const stateUrls = new Set()
  if (sitemap.ok) {
    for (const url of parseSitemapStateUrls(sitemap.text)) stateUrls.add(url)
  }

  for (const page of seedPages) {
    await sleep(requestDelay())
    const result = await fetchPage(page)
    if (!result.ok) {
      failed.push(`${page} (${result.status || result.error})`)
      continue
    }
    const $ = cheerio.load(result.text)
    for (const url of collectMatchingLinks($, isEventUrl)) urls.add(url)
    for (const url of collectMatchingLinks($, isStateUrl)) stateUrls.add(url)
  }

  const statesToVisit = sitemapOk ? [] : [...stateUrls]
  if (!sitemapOk) {
    console.log(`Crawling ${statesToVisit.length} state pages for event links...`)
  }
  for (const stateUrl of statesToVisit) {
    await sleep(requestDelay())
    const result = await fetchPage(stateUrl)
    if (!result.ok) {
      failed.push(`${stateUrl} (${result.status || result.error})`)
      continue
    }
    const $ = cheerio.load(result.text)
    for (const url of collectMatchingLinks($, isEventUrl)) urls.add(url)
  }

  return { urls: [...urls].sort(), discoverFailures: failed }
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aDate = a.dates.find((d) => d.date)?.date || '9999-99-99'
    const bDate = b.dates.find((d) => d.date)?.date || '9999-99-99'
    if (aDate !== bDate) return aDate.localeCompare(bDate)
    const state = cleanText(a.state).localeCompare(cleanText(b.state))
    if (state) return state
    return cleanText(a.city).localeCompare(cleanText(b.city))
  })
}

function listingFingerprint(events) {
  return JSON.stringify(
    events.map((event) => {
      const { lastUpdated, ...rest } = event
      return rest
    }),
  )
}

async function main() {
  let urls = []
  let discoverFailures = []
  const localDir = process.env.WLF_HTML_DIR

  if (localDir) {
    const files = (await readdir(localDir)).filter((file) => file.endsWith('.html'))
    urls = files.map((file) => {
      const slug = file.replace(/\.html$/, '')
      return `${BASE}/events/${slug}`
    })
    console.log(`Loaded ${urls.length} local HTML snapshots from ${localDir}`)
  } else {
    const discovered = await discoverEventUrls()
    urls = discovered.urls
    discoverFailures = discovered.discoverFailures
    console.log(`Discovered ${urls.length} event URLs`)
  }

  const events = []
  const failed = [...discoverFailures]
  const warningLines = []

  for (const [index, url] of urls.entries()) {
    const result = localDir
      ? {
          ok: true,
          status: 200,
          text: await readFile(
            path.join(localDir, `${new URL(url).pathname.split('/').pop()}.html`),
            'utf8',
          ),
          url,
        }
      : await fetchPage(url)
    if (!localDir) await sleep(requestDelay())
    process.stdout.write(`Scraping ${index + 1}/${urls.length}: ${url}\n`)
    if (!result.ok) {
      failed.push(`${url} (${result.status || result.error})`)
      continue
    }
    try {
      if (result.offsiteRedirect) {
        const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1)
        events.push({
          id: `${slug}-offsite`,
          name: 'Water Lantern Festival',
          city: slug ? slug.replace(/-/g, ' ') : null,
          state: null,
          country: null,
          dates: [],
          venue: null,
          address: null,
          schedule: [],
          tickets: [],
          ticketUrl: result.offsiteRedirect,
          eventUrl: url,
          source: 'Water Lantern Festival',
          sourceUrl: url,
          lastUpdated: todayStamp(),
        })
        warningLines.push(`${new URL(url).pathname}: official page redirected off-site`)
        continue
      }
      const { event, warnings } = parseEventPage(result.text, result.url || url)
      events.push(event)
      for (const warning of warnings) {
        const pathOnly = new URL(url).pathname
        warningLines.push(`${pathOnly}: ${warning}`)
      }
    } catch (error) {
      failed.push(`${url} (parse error: ${error.message})`)
    }
  }

  const sorted = sortEvents(events)
  if (sorted.length === 0) {
    console.error('No events scraped; not overwriting events.json')
    process.exitCode = 1
    return
  }
  let previous = null
  try {
    previous = JSON.parse(await readFile(outputPath, 'utf8'))
  } catch {
    previous = null
  }

  if (previous && listingFingerprint(previous) === listingFingerprint(sorted)) {
    console.log('')
    console.log(`Discovered ${urls.length} event URLs`)
    console.log(`Scraped ${sorted.length} events`)
    console.log('No listing changes; left events.json as-is')
    return
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')

  const knownDates = sorted.filter((event) => event.dates.some((d) => d.date)).length
  const comingSoon = sorted.filter(
    (event) => event.dateStatus === 'coming-soon' || event.dates.some((d) => d.dateStatus === 'coming-soon'),
  ).length
  const withTicketUrl = sorted.filter((event) => event.ticketUrl).length
  const withTickets = sorted.filter((event) => event.tickets?.length).length

  console.log('')
  console.log(`Discovered ${urls.length} event URLs`)
  console.log(`Scraped ${sorted.length} events`)
  console.log(`Known dates: ${knownDates}`)
  console.log(`Coming soon: ${comingSoon}`)
  console.log(`Ticket URLs: ${withTicketUrl}`)
  console.log(`Ticket data: ${withTickets}`)
  console.log(`Wrote ${outputPath}`)

  if (failed.length) {
    console.log('\nFailed URLs:')
    for (const line of failed) console.log(`* ${line}`)
  }
  if (warningLines.length) {
    console.log('\nWarnings:')
    for (const line of warningLines) console.log(`* ${line}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
