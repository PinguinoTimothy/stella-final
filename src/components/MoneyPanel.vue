
<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'

const app = useAppStore()

const props = defineProps({
  readonly: { type: Boolean, default: false }
})
const coins = ['pp', 'gp', 'sp', 'cp']
const coinValue = { pp: 1000, gp: 100, sp: 10, cp: 1 }

const expanded = ref(false)
const amounts = ref({
  pp: 0,
  gp: 0,
  sp: 0,
  cp: 0,
})

const money = computed(() => {
  if (!app.S.money) app.S.money = {}

  for (const coin of coins) {
    app.S.money[coin] = Math.max(
      0,
      Math.floor(Number(app.S.money[coin]) || 0),
    )
  }

  return app.S.money
})

const totalCp = computed(() =>
  coins.reduce(
    (total, coin) => total + money.value[coin] * coinValue[coin],
    0,
  ),
)

const totalGp = computed(() => formatNumber(totalCp.value / 100))

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })
}

function amountCp(amount) {
  return coins.reduce(
    (total, coin) => total + amount[coin] * coinValue[coin],
    0,
  )
}

function amountText(amount) {
  return coins
    .filter((coin) => amount[coin] > 0)
    .map((coin) => `${amount[coin]} ${coin}`)
    .join(' ')
}

function readAmounts() {
  return Object.fromEntries(
    coins.map((coin) => [
      coin,
      Math.max(0, Math.floor(Number(amounts.value[coin]) || 0)),
    ]),
  )
}

function normalize(cp) {
  const result = {}

  for (const coin of coins) {
    result[coin] = Math.floor(cp / coinValue[coin])
    cp -= result[coin] * coinValue[coin]
  }

  return result
}

function resetAmounts() {
  amounts.value = { pp: 0, gp: 0, sp: 0, cp: 0 }
}

function addMoney() {
  if (props.readonly) return
  const amount = readAmounts()

  if (!amountCp(amount)) {
    app.notify('Enter an amount first.')
    return
  }

  app.snapshot()

  for (const coin of coins) {
    money.value[coin] += amount[coin]
  }

  app.log('money', `Added ${amountText(amount)}`, `Total ${totalGp.value} gp`)
  app.notifyUndo(`Added ${amountText(amount)}`)
  resetAmounts()
}

function spendMoney() {
  if (props.readonly) return
  const amount = readAmounts()
  const needed = amountCp(amount)

  if (!needed) {
    app.notify('Enter an amount first.')
    return
  }

  if (totalCp.value < needed) {
    app.notify('Not enough coins.')
    return
  }

  const exact = coins.every(
    (coin) => money.value[coin] >= amount[coin],
  )

  app.snapshot()

  if (exact) {
    for (const coin of coins) {
      money.value[coin] -= amount[coin]
    }
  } else {
    const change = normalize(totalCp.value - needed)

    for (const coin of coins) {
      money.value[coin] = change[coin]
    }
  }

  const suffix = exact ? '' : ' (made change)'
  app.log(
    'money',
    `Spent ${amountText(amount)}${suffix}`,
    `Total ${totalGp.value} gp`,
  )
  app.notifyUndo(`Spent ${amountText(amount)}${suffix}`)
  resetAmounts()
}
</script>

<template>
  <section class="panel wal pot money-panel">
    <button
      class="wal-h"
      type="button"
      :aria-expanded="expanded"
      @click="readonly ? '' : expanded = !expanded"
    >
      <span class="wal-n">Party money</span>
      <span class="wal-t">{{ totalGp }} gp</span>
    </button>

    <div class="coins">
      <span
        v-for="coin in coins"
        :key="coin"
        class="coin"
        :class="{ z: !money[coin] }"
      >
        <b>{{ formatNumber(money[coin]) }}</b>
        {{ coin }}
      </span>
    </div>

    <div v-if="expanded & !readonly" class="wal-x">
      <div class="coin-in">
        <label v-for="coin in coins" :key="coin">
          {{ coin }}
          <input
            v-model.number="amounts[coin]"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            placeholder="0"
          >
        </label>
      </div>

      <div class="grid g2" v-if="!readonly">
        <button class="cast" type="button" @click="addMoney">
          Add
        </button>
        <button type="button" @click="spendMoney">
          Spend
        </button>
      </div>
    </div>
  </section>
</template>
