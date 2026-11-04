<script setup>
// Feat graph: requirements on the left, the feat in the middle (violet), what it unlocks on the right.
// Tap a feat to make it the centre. Read-only.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

cytoscape.use(dagre)

const props = defineProps({ graph: { type: Object, required: true } })
const emit = defineEmits(['select'])
const box = ref(null)
let cy = null

function elements(graph) {
  const nodes = graph.nodes.map((f) => ({
    data: { id: f.id, label: f.name, center: f.id === graph.center.id ? 1 : 0 },
  }))
  const edges = graph.edges.map((e) => ({
    data: { id: `${e.source}>${e.target}`, source: e.source, target: e.target },
  }))
  return [...nodes, ...edges]
}

function layout() {
  cy.layout({
    name: 'dagre',
    rankDir: 'LR',
    nodeSep: 10,
    rankSep: 90,
    edgeSep: 4,
    padding: 16,
    animate: false,
  }).run()
  cy.fit(undefined, 16)
}

onMounted(() => {
  cy = cytoscape({
    container: box.value,
    elements: elements(props.graph),
    minZoom: 0.4,
    maxZoom: 2.5,
    wheelSensitivity: 0.2,
    // Speed: while the graph moves, draw a snapshot and hide edges and labels.
    textureOnViewport: true,
    hideEdgesOnViewport: true,
    hideLabelsOnViewport: true,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'text-wrap': 'ellipsis',
          'text-max-width': 132,
          'font-size': 12,
          'min-zoomed-font-size': 9,
          color: '#e8f4f1',
          'text-valign': 'center',
          'text-halign': 'center',
          shape: 'round-rectangle',
          width: 150,
          height: 38,
          'background-color': '#172e3b',
          'border-width': 1,
          'border-color': '#2d5566',
        },
      },
      {
        selector: 'node[center = 1]',
        style: {
          'background-color': '#a99bff',
          color: '#120a33',
          'border-width': 0,
          'font-weight': 'bold',
          'font-size': 13,
        },
      },
      {
        selector: 'edge',
        style: {
          width: 1.2,
          'line-color': '#4a6c78',
          'target-arrow-color': '#4a6c78',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 0.8,
          'curve-style': 'straight',
        },
      },
    ],
  })
  cy.on('tap', 'node', (e) => emit('select', e.target.id()))
  layout()
})

watch(
  () => props.graph,
  () => {
    if (!cy) return
    cy.elements().remove()
    cy.add(elements(props.graph))
    layout()
  },
)

onBeforeUnmount(() => {
  cy?.destroy()
  cy = null
})
</script>

<template>
  <div
    ref="box"
    class="feat-graph"
    role="img"
    :aria-label="`Graph of ${graph.center.name}`"
  />
</template>

<style scoped>
.feat-graph {
  width: 100%;
  height: 340px;
  border-radius: 14px;
  background: var(--raise, #172e3b);
  border: 1px solid var(--line, #264452);
  touch-action: none;
}

@media (min-width: 900px) {
  .feat-graph {
    height: 420px;
  }
}
</style>