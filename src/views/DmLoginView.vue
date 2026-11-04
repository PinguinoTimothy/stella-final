<script setup>
import { ref } from 'vue';
import { useCloudStore } from '../stores/cloud';

const cloud = useCloudStore();
const pin = ref('');
const busy = ref(false);
const error = ref('');

async function unlock() {
  if (!/^\d{6}$/.test(pin.value)) {
    error.value = 'Enter the 6-digit code.';
    return;
  }
  busy.value = true;
  error.value = '';
  const ok = await cloud.dmUnlock(pin.value);
  busy.value = false;
  pin.value = '';
  if (!ok) {
    error.value =
      cloud.code === 'locked' ? 'Too many wrong codes. Locked for a while; each lock lasts longer.' : 'Wrong code.';
  }
}
</script>

<template>
  <section class="dm-login">
    <h2 class="pg">Dungeon Master</h2>
    <p class="mute">Enter the 6-digit code.</p>
    <form class="panel grid" data-ro-ok @submit.prevent="unlock">
      <input
        v-model="pin"
        type="password"
        inputmode="numeric"
        maxlength="6"
        autocomplete="off"
        placeholder="····"
        aria-label="Code"
      />
      <p v-if="error" class="mute" role="alert">
        {{ error }}
      </p>
      <button class="cast" type="submit" :disabled="busy">Unlock</button>
    </form>
  </section>
</template>
