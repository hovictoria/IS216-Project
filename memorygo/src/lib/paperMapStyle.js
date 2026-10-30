// ----------------------------------------------------------------------------------------------------------
// PSEUDOCODE
// filename:   lib/paperMapStyle.js
// purpose:    - recolours the free OpenFreeMap "liberty" style into MemoryGo's warm paper look
//             - moved out of the old views/map.vue so any page with a map can reuse it
// usage:      map.on('style.load', () => applyPaperStyle(map))
// ----------------------------------------------------------------------------------------------------------

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// landing page colours (from SplashMap.vue)
const C = {
    land: '#F3E8D2',
    landuse: '#EFE2C6',
    park: '#CFE0B4',
    water: '#A9D3E6',
    road: '#FDFBF2',
    roadEdge: '#E8D8B7',
    text: '#4D4134',
    textHalo: '#FFFBF2',
}

// building colours: cream like the HDB blocks, pastels like the shophouses
const BUILDING_COLOURS = ['#F2C4B4', '#F3D58A', '#FFFBF2', '#F4E6CB']

// Go through every layer of the map style and swap its colours for ours
export function applyPaperStyle(map) {
    for (const layer of map.getStyle().layers) {
        const id = layer.id
        const source = layer['source-layer']

        if (layer.type === 'background') {
            map.setPaintProperty(id, 'background-color', C.land)
        } else if (layer.type === 'fill') {
            if (source === 'water') map.setPaintProperty(id, 'fill-color', C.water)
            else if (source === 'park' || source === 'landcover') {
                map.setPaintProperty(id, 'fill-color', C.park)
                map.setPaintProperty(id, 'fill-opacity', 1)
            }
            else if (source === 'landuse') map.setPaintProperty(id, 'fill-color', C.landuse)
            else if (source === 'building') map.setPaintProperty(id, 'fill-color', C.roadEdge)
        } else if (layer.type === 'line' && source === 'transportation') {
            const colour = id.includes('casing') ? C.roadEdge : C.road
            map.setPaintProperty(id, 'line-color', colour)
        } else if (layer.type === 'symbol') {
            if (source === 'poi' || source === 'housenumber') {
                map.setLayoutProperty(id, 'visibility', 'none')
            }
            else {
                map.setPaintProperty(id, 'text-color', C.text)
                map.setPaintProperty(id, 'text-halo-color', C.textHalo)
            }
        } else if (layer.type === 'fill-extrusion') {
            const height = ['coalesce', ['get', 'render_height'], 8]
            const pick = ['%', ['round', height], 4]
            map.setPaintProperty(id, 'fill-extrusion-color',
                ['match', pick, 0, BUILDING_COLOURS[0], 1, BUILDING_COLOURS[1], 2, BUILDING_COLOURS[2], BUILDING_COLOURS[3]])
            map.setPaintProperty(id, 'fill-extrusion-height', ['*', 0.35, height])
            map.setPaintProperty(id, 'fill-extrusion-base', 0)
        }
    }
}
