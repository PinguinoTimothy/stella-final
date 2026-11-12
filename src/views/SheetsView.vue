<script setup>
// Character sheets: upload a fillable PDF, open one in the viewer, delete one.
import { onMounted, ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useSheetsStore } from '../stores/sheets';

const app = useAppStore();
const sheets = useSheetsStore();
const busy = ref(false);
const msg = ref('');

onMounted(() => sheets.refresh());

async function onFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  busy.value = true;
  msg.value = '';
  try {
    const id = await sheets.upload(file);
    await sheets.open(id);
    msg.value = 'Sheet added.';
  } catch (err) {
    msg.value = err && err.message ? err.message : 'The sheet could not be uploaded.';
  } finally {
    busy.value = false;
  }
}

async function remove(s) {
  const ok = await app.ask({ title: 'Delete sheet?', msg: `${s.name} and its saved values will be deleted.`, ok: 'Delete', danger: true });
  if (ok) await sheets.remove(s.id);
}
</script>

<template>
  <h2 class="pg">Character sheets</h2>

  <section class="panel">
    <p class="mute" style="margin: 0 0 10px">
      Upload a fillable PDF sheet. It stays in your cloud, opens in a viewer you can minimize, and its fields can be edited here.
    </p>
    <label class="sh-up" :aria-disabled="busy">
      <input type="file" accept="application/pdf" :disabled="busy" @change="onFile">
      <span>{{ busy ? 'Uploading…' : 'Upload a PDF' }}</span>
    </label>
    <p v-if="msg" class="mute" role="status">{{ msg }}</p>
    <p v-if="sheets.error" class="mute" role="alert">{{ sheets.error }}</p>
  </section>

  <section v-for="s in sheets.list" :key="s.id" class="panel sh-row">
    <button class="sh-open" @click="sheets.open(s.id)">
      <strong>{{ s.name }}</strong>
      <span class="mute">{{ Object.keys(s.fields || {}).length }} saved values</span>
    </button>
    <button class="danger" :aria-label="'Delete ' + s.name" @click="remove(s)">Delete</button>
  </section>

  <p v-if="!sheets.list.length && !sheets.error" class="mute">No sheets yet.</p>
</template>
