<template><div><h3>听写模式</h3><button @click="play">播放</button><input v-model="ans" @keyup.enter="check" /></div></template>
<script setup>
import { ref, defineProps } from 'vue'
const props = defineProps({ words: Array })
const ans = ref('')
const play = ()=>{}
const check = ()=>{}
</script>