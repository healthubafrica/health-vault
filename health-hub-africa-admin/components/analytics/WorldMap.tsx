'use client'

import { useMemo } from 'react'
import { Chart as ChartJS, Tooltip, Legend } from 'chart.js'
import { Chart } from 'react-chartjs-2'
import {
  ChoroplethController,
  GeoFeature,
  ColorScale,
  ColorLogarithmicScale,
  ProjectionScale,
} from 'chartjs-chart-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import iso3166 from 'iso-3166-1'
import worldAtlas from 'world-atlas/countries-110m.json'

ChartJS.register(ChoroplethController, GeoFeature, ColorScale, ColorLogarithmicScale, ProjectionScale, Tooltip, Legend)

export interface MapCountry {
  countryCode: string
  /** null = the metric isn't defined for this country (e.g. a rate whose denominator never fired). */
  value: number | null
}

interface WorldMapProps {
  countries: MapCountry[]
  metricLabel: string
  /** 'count' metrics are heavily skewed toward a few countries, so they use a log colour scale; rates (0–100) stay linear. */
  kind: 'count' | 'rate'
  unit?: string
}

const topology = worldAtlas as unknown as Topology<{ countries: GeometryCollection }>
const FEATURES = feature(topology, topology.objects.countries).features

// world-atlas identifies countries by ISO 3166-1 *numeric* code; our data is alpha-2.
const numericId = (id: string | number | undefined) => (id == null ? '' : String(id).padStart(3, '0'))

/**
 * Choropleth of an aggregated, country-level metric. Data is IP-derived access
 * geography (approximate) — never coordinates, addresses or raw IPs (spec §F).
 *
 * The 110m atlas has no polygon for ~75 ISO countries (mostly microstates like
 * Singapore/Mauritius) plus non-ISO codes like XK. Those still have real data,
 * so they're listed under the map instead of silently disappearing.
 */
export default function WorldMap({ countries, metricLabel, kind, unit = '' }: WorldMapProps) {
  const { data, notDrawn } = useMemo(() => {
    const valueByNumeric = new Map<string, MapCountry>()
    const undrawable: MapCountry[] = []
    const drawable = new Set(FEATURES.map((f) => numericId(f.id)))
    for (const c of countries) {
      const numeric = numericId(iso3166.whereAlpha2(c.countryCode)?.numeric)
      if (numeric && drawable.has(numeric)) valueByNumeric.set(numeric, c)
      else if (c.value != null) undrawable.push(c)
    }
    return {
      data: FEATURES.map((f) => ({
        feature: f,
        // log scale can't place 0, and "0" isn't "no data" anyway — both render as the neutral fill
        value: (() => {
          const v = valueByNumeric.get(numericId(f.id))?.value ?? null
          return kind === 'count' && v === 0 ? null : v
        })(),
      })),
      notDrawn: undrawable,
    }
  }, [countries, kind])

  return (
    <div>
      <div style={{ height: 360 }} role="img" aria-label={`World map of ${metricLabel} by country. A table of the top countries follows.`}>
        <Chart
          type="choropleth"
          data={{
            labels: FEATURES.map((f) => (f.properties as { name?: string } | null)?.name ?? ''),
            datasets: [{ label: metricLabel, data }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            showOutline: false,
            showGraticule: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1A251A',
                borderColor: '#253525',
                borderWidth: 1,
                titleColor: '#D0E8D0',
                bodyColor: '#8A9A8A',
                callbacks: {
                  label: (ctx) => {
                    const raw = ctx.raw as { value: number | null }
                    return raw.value == null ? 'No data' : `${metricLabel}: ${raw.value.toLocaleString()}${unit}`
                  },
                },
              },
            },
            scales: {
              projection: { axis: 'x', projection: 'equalEarth' },
              color: {
                axis: 'x',
                type: kind === 'count' ? 'colorLogarithmic' : 'color',
                interpolate: 'greens',
                missing: '#E5EBE5',
                legend: { position: 'bottom-left', align: 'right' },
              },
            },
          }}
        />
      </div>
      {notDrawn.length > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
          Not drawable at this map resolution:{' '}
          {notDrawn.map((c) => `${c.countryCode} (${c.value?.toLocaleString()}${unit})`).join(', ')}
        </p>
      )}
    </div>
  )
}
