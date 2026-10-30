<script setup>
// Admin sign-in gate. Shown instead of the app until there is a Supabase session.
// Players use the ?view=1 link and never see this screen.
import { ref } from 'vue'
import { useCloudStore } from '../stores/cloud'

const cloud = useCloudStore()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  if (busy.value) return
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await cloud.signIn(email.value.trim(), password.value)
    password.value = ''
  } catch (e) {
    error.value = e && e.code === 400
      ? 'Wrong email or password.'
      : 'Couldn’t sign in. Check your connection and try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login">
    <form class="panel login-card" @submit.prevent="submit">
      <h1>Admin</h1>
      <p class="mute">Sign in to manage the game.</p>

      <input
        v-model="email"
        type="email"
        name="email"
        autocomplete="username"
        inputmode="email"
        placeholder="Email"
        aria-label="Email"
        :disabled="busy"
      >
      <input
        v-model="password"
        type="password"
        name="password"
        autocomplete="current-password"
        placeholder="Password"
        aria-label="Password"
        :disabled="busy"
      >

      <p v-if="error" class="login-err" role="alert">{{ error }}</p>

      <button class="cast" type="submit" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>
  </main>
</template>
