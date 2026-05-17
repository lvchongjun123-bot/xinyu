<template><div><p>进度：{{ Math.round(mastered/total*100) }}%</p></div></template>
<script setup>import { defineProps, computed } from 'vue'
const props = defineProps({ words: Array })
const total = computed(()=>props.words.length)
const mastered = computed(()=>props.words.filter(w=>w.mastered).length)
</script>